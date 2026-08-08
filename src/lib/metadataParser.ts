import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

export function getPrimaryArtist(artistStr: string): string {
  if (!artistStr) return 'Artista Sconosciuto';
  const parts = artistStr
    .split(/;|\/|\\|,(?=\s*[A-Z0-9a-zÀ-ÿ])|(?:\s+(?:feat|ft|featuring)\.?\s+)|(?:\s+&\s+)|(?:\s+and\s+)/i);
  const primary = parts[0]?.trim();
  return primary || 'Artista Sconosciuto';
}

export function splitArtists(artistStr: string): string[] {
  if (!artistStr) return [];
  return artistStr
    .split(/;|\/|\\|,(?=\s*[A-Z0-9a-zÀ-ÿ])|(?:\s+(?:feat|ft|featuring)\.?\s+)|(?:\s+&\s+)|(?:\s+and\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Strict word-boundary / exact token matching for artists.
 * Prevents "Anna" from matching "Annalisa" or vice-versa!
 */
export function isArtistMatch(
  trackArtist: string | undefined | null,
  targetArtist: string | undefined | null,
  displayName?: string | null
): boolean {
  if (!trackArtist || !targetArtist) return false;

  const targetClean = targetArtist.trim().toLowerCase();
  const displayClean = displayName ? displayName.trim().toLowerCase() : '';
  const primaryTarget = getPrimaryArtist(targetArtist).trim().toLowerCase();

  const trackPrimary = getPrimaryArtist(trackArtist).trim().toLowerCase();
  const trackFull = trackArtist.trim().toLowerCase();

  // 1. Direct exact match of primary artist name or full string
  if (
    trackPrimary === targetClean ||
    trackPrimary === primaryTarget ||
    trackFull === targetClean ||
    (displayClean && (trackPrimary === displayClean || trackFull === displayClean))
  ) {
    return true;
  }

  // 2. Token-by-token exact matching across individual artists in multi-artist strings
  // e.g. "Anna, Capo Plaza" splits into ["anna", "capo plaza"]
  const artistsInTrack = splitArtists(trackArtist).map((a) => a.toLowerCase());
  for (const art of artistsInTrack) {
    if (
      art === targetClean ||
      art === primaryTarget ||
      (displayClean && art === displayClean)
    ) {
      return true;
    }
  }

  return false;
}

export interface ExtractedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  year?: number;
  genre?: string;
  embeddedCoverUrl?: string;
}

export async function extractAudioMetadata(file: File): Promise<ExtractedMetadata> {
  return new Promise((resolve) => {
    try {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          const tags = tag.tags;
          let embeddedCoverUrl: string | undefined = undefined;

          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              let base64String = '';
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              const mime = format || 'image/jpeg';
              embeddedCoverUrl = `data:${mime};base64,${btoa(base64String)}`;
            } catch (e) {
              console.warn('Could not parse embedded cover image:', e);
            }
          }

          let trackNum: number | undefined = undefined;
          if (tags.track) {
            const parsedTrack = parseInt(String(tags.track).split('/')[0], 10);
            if (!isNaN(parsedTrack)) trackNum = parsedTrack;
          }

          let yearNum: number | undefined = undefined;
          if (tags.year) {
            const parsedYear = parseInt(String(tags.year), 10);
            if (!isNaN(parsedYear)) yearNum = parsedYear;
          }

          resolve({
            title: tags.title ? String(tags.title).trim() : undefined,
            artist: tags.artist ? String(tags.artist).trim() : undefined,
            album: tags.album ? String(tags.album).trim() : undefined,
            trackNumber: trackNum,
            year: yearNum,
            genre: tags.genre ? String(tags.genre).trim() : undefined,
            embeddedCoverUrl,
          });
        },
        onError: () => {
          resolve({});
        },
      });
    } catch (e) {
      resolve({});
    }
  });
}

/**
 * Intelligent filename and folder path parser fallback
 * e.g., "01 - Artist Name - Track Title.mp3", "01. Track Title.flac", "Artist - Title.mp3"
 */
export function parseFilenameMetadata(filePathOrName: string, folderName?: string) {
  const parts = filePathOrName.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  let title = nameWithoutExt;
  let artist = 'Artista Sconosciuto';
  let album = folderName || 'Album Importato';
  let trackNum: number | undefined = undefined;

  // Check if folderName is formatted as "Artist - Album"
  if (folderName && folderName.includes(' - ')) {
    const [folderArtist, folderAlbum] = folderName.split(' - ').map((s) => s.trim());
    if (folderArtist) artist = folderArtist;
    if (folderAlbum) album = folderAlbum;
  }

  // Common patterns in track filenames:
  // 1. "01 - Artist - Title" or "01. Artist - Title"
  // 2. "01 - Title" or "01. Title" or "01 Title"
  // 3. "Artist - Title"
  const trackNumMatch = nameWithoutExt.match(/^(\d{1,3})[\s.\-_]+(.+)$/);
  if (trackNumMatch) {
    trackNum = parseInt(trackNumMatch[1], 10);
    const rest = trackNumMatch[2].trim();

    if (rest.includes(' - ')) {
      const restParts = rest.split(' - ').map((s) => s.trim());
      if (restParts.length >= 2) {
        artist = restParts[0];
        title = restParts.slice(1).join(' - ');
      } else {
        title = rest;
      }
    } else {
      title = rest;
    }
  } else if (nameWithoutExt.includes(' - ')) {
    const parts = nameWithoutExt.split(' - ').map((s) => s.trim());
    if (parts.length >= 2) {
      artist = parts[0];
      title = parts.slice(1).join(' - ');
    }
  }

  return { title, artist, album, trackNum };
}

/**
 * M3U / M3U8 Playlist Parser
 * Parses lines in .m3u files and returns list of relative audio filenames or titles in order
 */
export function parseM3uFile(m3uContent: string): string[] {
  const lines = m3uContent.split(/\r?\n/);
  const trackList: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Line is a filename or path
    const parts = trimmed.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1].toLowerCase();
    trackList.push(filename);
  }

  return trackList;
}
