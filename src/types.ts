export type AudioFormat = 'FLAC' | 'Dolby Atmos' | 'Hi-Res WAV' | 'MP3' | 'AAC' | 'OGG';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  coverUrl: string;
  originalCoverUrl?: string;
  cropParams?: { zoom: number; offsetX: number; offsetY: number };
  audioUrl: string; // Blob URL or demo audio URL
  audioBlob?: Blob; // Native binary blob stored in IndexedDB for reliable reload & Tauri support
  format: AudioFormat;
  bitrate: string; // e.g., "24-bit / 96.0 kHz"
  channels: string; // e.g., "2.0 Stereo", "7.1.4 Dolby Atmos Bed"
  genre: string;
  year?: number;
  isFavorite: boolean;
  addedAt: string;
  fileSize?: string;
  isUserUploaded?: boolean;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl?: string;
  originalCoverUrl?: string;
  cropParams?: { zoom: number; offsetX: number; offsetY: number };
  trackIds: string[];
  colorTag: string; // Hex color for Material Expressive pill tag
  createdAt: string;
  isSmart?: boolean;
  smartType?: 'favorites' | 'flac' | 'atmos' | 'recent';
}

export interface ArtistProfile {
  id: string;
  originalName: string;
  name: string;
  coverUrl: string;
  originalCoverUrl?: string;
  cropParams?: { zoom: number; offsetX: number; offsetY: number };
  bio?: string;
}

export type SpatialMode = 'stereo' | 'dolby_atmos' | 'cinema_surround' | 'concert_hall' | 'head_tracking';

export interface EqualizerBands {
  b31: number;
  b62: number;
  b125: number;
  b250: number;
  b500: number;
  b1k: number;
  b2k: number;
  b4k: number;
  b8k: number;
  b16k: number;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: EqualizerBands;
}

export interface MaterialPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  surface: string;
  surfaceContainer: string;
  onSurface: string;
  outline: string;
  glowColor: string;
}

export type ActiveTab = 'library' | 'playlists' | 'search' | 'eq_atmos';

export interface Spatial3DPosition {
  x: number; // -10 to +10
  y: number; // -10 to +10
  z: number; // -10 to +10
  roomSize: number; // 0.1 to 1.0
  subBassBoost: number; // 0 to 12 dB
}

export type TransitionSpeed = 'disabled' | 'fast' | 'normal' | 'slow';
