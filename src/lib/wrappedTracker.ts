import { Track } from '../types';
import { getPrimaryArtist } from './metadataParser';

export interface PlayRecord {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  primaryArtist: string;
  album: string;
  coverUrl: string;
  genre: string;
  duration: number; // in seconds
  timestamp: number; // Date.now()
}

export type WrappedTimeframe = 'month' | 'year' | 'lifetime';

const STORAGE_KEY = 'sonora_wrapped_play_history_v1';

/**
 * Load all recorded plays from LocalStorage
 */
export function getPlayHistory(): PlayRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error('Error loading Wrapped play history:', e);
  }
  return [];
}

/**
 * Helper to ensure we never store huge base64 data URIs in LocalStorage
 */
function sanitizeCoverUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return ''; // Strip base64 data URIs to save storage quota
  if (url.length > 500) return ''; // Strip excessively long URLs
  return url;
}

/**
 * Save all play records to LocalStorage with automatic quota fallback & cleanup
 */
function savePlayHistory(history: PlayRecord[]): void {
  // Always sanitize records before saving
  const sanitized = history.map((rec) => {
    if (rec.coverUrl && (rec.coverUrl.startsWith('data:') || rec.coverUrl.length > 500)) {
      return { ...rec, coverUrl: '' };
    }
    return rec;
  });

  // Try saving with decreasing limits if quota error occurs
  const limits = [5000, 2000, 1000, 500, 200, 100];
  for (const limit of limits) {
    try {
      const trimmed = sanitized.slice(-limit);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return; // Success
    } catch (e) {
      console.warn(`LocalStorage setItem quota warning at limit ${limit}:`, e);
    }
  }
}

/**
 * Record a song play event with timestamp
 */
export function recordTrackPlay(track: Track): PlayRecord {
  const primary = getPrimaryArtist(track.artist) || track.artist;
  const record: PlayRecord = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    primaryArtist: primary,
    album: track.album || '',
    coverUrl: sanitizeCoverUrl(track.coverUrl),
    genre: track.genre || 'Musica',
    duration: track.duration || 180,
    timestamp: Date.now(),
  };

  const current = getPlayHistory();
  current.push(record);
  savePlayHistory(current);

  // Dispatch custom event so open UI components update in real time
  window.dispatchEvent(new CustomEvent('sonora_play_recorded', { detail: record }));

  return record;
}

/**
 * Filter history based on timeframe
 */
export function filterHistoryByTimeframe(history: PlayRecord[], timeframe: WrappedTimeframe): PlayRecord[] {
  if (timeframe === 'lifetime') return history;

  const now = Date.now();
  if (timeframe === 'month') {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return history.filter((p) => now - p.timestamp <= thirtyDaysMs);
  }

  if (timeframe === 'year') {
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    return history.filter((p) => now - p.timestamp <= oneYearMs);
  }

  return history;
}

export interface TopItem<T> {
  item: T;
  playCount: number;
  totalDurationSeconds: number;
  percentage: number;
}

export interface WrappedStats {
  timeframe: WrappedTimeframe;
  totalPlays: number;
  totalDurationSeconds: number;
  totalMinutes: number;
  totalHours: number;
  uniqueSongsCount: number;
  uniqueArtistsCount: number;
  topSongs: TopItem<{ id: string; title: string; artist: string; coverUrl: string; album: string }>[];
  topArtists: TopItem<{ name: string; coverUrl: string }>[];
  topGenres: { genre: string; count: number; percentage: number }[];
}

/**
 * Compute listening statistics for a given timeframe
 */
export function getWrappedStats(timeframe: WrappedTimeframe, libraryTracks: Track[] = []): WrappedStats {
  const allHistory = getPlayHistory();
  const filtered = filterHistoryByTimeframe(allHistory, timeframe);

  const totalPlays = filtered.length;
  let totalDurationSeconds = 0;

  const songMap = new Map<string, { title: string; artist: string; coverUrl: string; album: string; plays: number; duration: number }>();
  const artistMap = new Map<string, { name: string; coverUrl: string; plays: number; duration: number }>();
  const genreMap = new Map<string, number>();

  // Map library track cover lookup for fresh images
  const coverByTrackId = new Map<string, string>();
  const artistCoverMap = new Map<string, string>();

  libraryTracks.forEach((t) => {
    if (t.id && t.coverUrl) coverByTrackId.set(t.id, t.coverUrl);
    const prim = getPrimaryArtist(t.artist);
    if (prim && t.coverUrl && !artistCoverMap.has(prim)) {
      artistCoverMap.set(prim, t.coverUrl);
    }
  });

  filtered.forEach((p) => {
    totalDurationSeconds += p.duration;

    // Track stats
    const trackKey = p.trackId || p.title;
    const existingSong = songMap.get(trackKey);
    const songCover = coverByTrackId.get(p.trackId) || p.coverUrl || '';
    if (existingSong) {
      existingSong.plays += 1;
      existingSong.duration += p.duration;
      if (!existingSong.coverUrl && songCover) existingSong.coverUrl = songCover;
    } else {
      songMap.set(trackKey, {
        title: p.title,
        artist: p.artist,
        coverUrl: songCover,
        album: p.album,
        plays: 1,
        duration: p.duration,
      });
    }

    // Artist stats
    const artistName = p.primaryArtist || getPrimaryArtist(p.artist) || p.artist;
    const existingArtist = artistMap.get(artistName);
    const artCover = artistCoverMap.get(artistName) || p.coverUrl || '';
    if (existingArtist) {
      existingArtist.plays += 1;
      existingArtist.duration += p.duration;
      if (!existingArtist.coverUrl && artCover) existingArtist.coverUrl = artCover;
    } else {
      artistMap.set(artistName, {
        name: artistName,
        coverUrl: artCover,
        plays: 1,
        duration: p.duration,
      });
    }

    // Genre stats
    if (p.genre) {
      genreMap.set(p.genre, (genreMap.get(p.genre) || 0) + 1);
    }
  });

  // Top Songs
  const sortedSongs = Array.from(songMap.entries())
    .map(([id, data]) => ({
      item: { id, title: data.title, artist: data.artist, coverUrl: data.coverUrl, album: data.album },
      playCount: data.plays,
      totalDurationSeconds: data.duration,
      percentage: totalPlays > 0 ? Math.round((data.plays / totalPlays) * 100) : 0,
    }))
    .sort((a, b) => b.playCount - a.playCount || b.totalDurationSeconds - a.totalDurationSeconds)
    .slice(0, 5);

  // Top Artists
  const sortedArtists = Array.from(artistMap.entries())
    .map(([name, data]) => ({
      item: { name, coverUrl: data.coverUrl },
      playCount: data.plays,
      totalDurationSeconds: data.duration,
      percentage: totalPlays > 0 ? Math.round((data.plays / totalPlays) * 100) : 0,
    }))
    .sort((a, b) => b.playCount - a.playCount || b.totalDurationSeconds - a.totalDurationSeconds)
    .slice(0, 5);

  // Top Genres
  const sortedGenres = Array.from(genreMap.entries())
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: totalPlays > 0 ? Math.round((count / totalPlays) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalMinutes = Math.round(totalDurationSeconds / 60);
  const totalHours = parseFloat((totalDurationSeconds / 3600).toFixed(1));

  return {
    timeframe,
    totalPlays,
    totalDurationSeconds,
    totalMinutes,
    totalHours,
    uniqueSongsCount: songMap.size,
    uniqueArtistsCount: artistMap.size,
    topSongs: sortedSongs,
    topArtists: sortedArtists,
    topGenres: sortedGenres,
  };
}

/**
 * Seed realistic sample demo play history across various past timestamps (month, year, lifetime)
 */
export function seedDemoWrappedHistory(libraryTracks: Track[]): void {
  if (!libraryTracks || libraryTracks.length === 0) return;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const demoRecords: PlayRecord[] = [];

  // Generate 80 plays spread over the last 400 days
  for (let i = 0; i < 90; i++) {
    const track = libraryTracks[i % libraryTracks.length];
    const primary = getPrimaryArtist(track.artist) || track.artist;

    // Distribute timestamps: 30 in last 30 days, 30 in last 365 days, 30 older
    let daysAgo = 0;
    if (i < 35) {
      daysAgo = Math.floor(Math.random() * 28);
    } else if (i < 65) {
      daysAgo = 30 + Math.floor(Math.random() * 300);
    } else {
      daysAgo = 365 + Math.floor(Math.random() * 300);
    }

    demoRecords.push({
      id: `demo_${i}_${Math.random().toString(36).substring(2, 6)}`,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      primaryArtist: primary,
      album: track.album || 'Demo Album',
      coverUrl: sanitizeCoverUrl(track.coverUrl),
      genre: track.genre || 'Hi-Fi Audio',
      duration: track.duration || 210,
      timestamp: now - daysAgo * dayMs - Math.floor(Math.random() * 3600000),
    });
  }

  savePlayHistory(demoRecords);
  window.dispatchEvent(new CustomEvent('sonora_play_recorded'));
}

/**
 * Clear wrapped history
 */
export function clearWrappedHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('sonora_play_recorded'));
}
