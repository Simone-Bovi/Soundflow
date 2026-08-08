import { LyricLine, Track } from '../types';

export interface ParsedLrcResult {
  title?: string;
  artist?: string;
  album?: string;
  lyrics: LyricLine[];
}

/**
 * Parses standard LRC lyrics format text into structured LyricLine array and extracts optional metadata.
 */
export function parseLrcWithMetadata(lrcText: string): ParsedLrcResult {
  if (!lrcText) {
    return { lyrics: [] };
  }

  const lines = lrcText.split(/\r?\n/);
  const lyrics: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Extract metadata tags like [ti:Title], [ar:Artist], [al:Album]
    const tiMatch = /^\[ti:\s*(.*?)\s*\]$/i.exec(trimmed);
    if (tiMatch) {
      title = tiMatch[1];
      continue;
    }

    const arMatch = /^\[ar:\s*(.*?)\s*\]$/i.exec(trimmed);
    if (arMatch) {
      artist = arMatch[1];
      continue;
    }

    const alMatch = /^\[al:\s*(.*?)\s*\]$/i.exec(trimmed);
    if (alMatch) {
      album = alMatch[1];
      continue;
    }

    // Skip other metadata tags
    if (/^\[(by|offset|length|au|re|ve):/i.test(trimmed)) {
      continue;
    }

    const text = trimmed.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();

    let match;
    timeRegex.lastIndex = 0;

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fracStr = match[3] || '0';

      let secondsFraction = 0;
      if (fracStr.length === 1) {
        secondsFraction = parseInt(fracStr, 10) / 10;
      } else if (fracStr.length === 2) {
        secondsFraction = parseInt(fracStr, 10) / 100;
      } else if (fracStr.length === 3) {
        secondsFraction = parseInt(fracStr, 10) / 1000;
      }

      const totalTime = minutes * 60 + seconds + secondsFraction;
      if (text) {
        lyrics.push({ time: totalTime, text });
      }
    }
  }

  // Sort by timestamp
  lyrics.sort((a, b) => a.time - b.time);

  return {
    title,
    artist,
    album,
    lyrics,
  };
}

/**
 * Parses standard LRC lyrics format text into structured LyricLine array.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  return parseLrcWithMetadata(lrcText).lyrics;
}

/**
 * Helper to normalize string for comparison (stripping diacritics, leading numbers, punctuation)
 */
export function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^[\d\s.\-_]+/, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart automatic matcher for an LRC file against a list of tracks.
 */
export function matchLrcToTrack(
  lrcText: string,
  filename: string,
  tracks: Track[]
): { track: Track; parsed: ParsedLrcResult } | null {
  if (!tracks.length) return null;

  const parsed = parseLrcWithMetadata(lrcText);
  if (!parsed.lyrics.length) return null;

  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  const normFilename = normalizeForMatch(cleanFilename);

  // 1. Tag-based match ([ti:...] and optional [ar:...])
  if (parsed.title) {
    const normTagTitle = normalizeForMatch(parsed.title);
    const normTagArtist = parsed.artist ? normalizeForMatch(parsed.artist) : '';

    const exactTagMatch = tracks.find((t) => {
      const normTrackTitle = normalizeForMatch(t.title);
      const normTrackArtist = normalizeForMatch(t.artist);

      const titleMatches = normTrackTitle === normTagTitle || normTrackTitle.includes(normTagTitle) || normTagTitle.includes(normTrackTitle);
      if (!titleMatches) return false;

      if (normTagArtist && normTrackArtist) {
        return normTrackArtist.includes(normTagArtist) || normTagArtist.includes(normTrackArtist);
      }
      return true;
    });

    if (exactTagMatch) {
      return { track: exactTagMatch, parsed };
    }
  }

  // 2. Exact normalized filename match against track title
  if (normFilename) {
    const exactFilenameMatch = tracks.find((t) => {
      const normTrackTitle = normalizeForMatch(t.title);
      return normTrackTitle === normFilename;
    });

    if (exactFilenameMatch) {
      return { track: exactFilenameMatch, parsed };
    }
  }

  // 3. Filename matching "Artist - Title" or "Title - Artist"
  if (normFilename) {
    const combinedMatch = tracks.find((t) => {
      const normTitle = normalizeForMatch(t.title);
      const normArtist = normalizeForMatch(t.artist);
      const normCombo1 = `${normArtist} ${normTitle}`;
      const normCombo2 = `${normTitle} ${normArtist}`;

      return normFilename === normCombo1 || normFilename === normCombo2 ||
             normFilename.includes(normCombo1) || normCombo1.includes(normFilename);
    });

    if (combinedMatch) {
      return { track: combinedMatch, parsed };
    }
  }

  // 4. Substring containment match (filename contains track title or track title contains filename)
  if (normFilename && normFilename.length >= 3) {
    const substringMatch = tracks.find((t) => {
      const normTitle = normalizeForMatch(t.title);
      return normTitle.length >= 3 && (normFilename.includes(normTitle) || normTitle.includes(normFilename));
    });

    if (substringMatch) {
      return { track: substringMatch, parsed };
    }
  }

  // 5. Token overlap score
  if (normFilename && normFilename.length >= 3) {
    const filenameTokens = normFilename.split(' ').filter((w) => w.length >= 2);

    let bestScore = 0;
    let bestTrack: Track | null = null;

    for (const track of tracks) {
      const trackTokens = normalizeForMatch(`${track.title} ${track.artist}`)
        .split(' ')
        .filter((w) => w.length >= 2);

      if (!filenameTokens.length || !trackTokens.length) continue;

      let matchCount = 0;
      for (const ft of filenameTokens) {
        if (trackTokens.some((tt) => tt === ft || tt.includes(ft) || ft.includes(tt))) {
          matchCount++;
        }
      }

      const score = matchCount / Math.max(filenameTokens.length, trackTokens.length);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestTrack = track;
      }
    }

    if (bestTrack) {
      return { track: bestTrack, parsed };
    }
  }

  return null;
}
