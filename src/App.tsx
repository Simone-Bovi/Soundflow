import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, ArtistProfile, EqualizerBands, LyricLine, MaterialPalette, Playlist, Spatial3DPosition, SpatialMode, Track, TransitionSpeed } from './types';
import { INITIAL_PLAYLISTS, INITIAL_TRACKS } from './data/defaultTracks';
import { applyBackgroundTheme, extractMaterialPalette, generatePaletteFromHex } from './lib/colorExtractor';
import { audioEngine } from './lib/audioEngine';
import { getPrimaryArtist, isArtistMatch } from './lib/metadataParser';
import { recordTrackPlay } from './lib/wrappedTracker';
import {
  clearAllDatabaseData,
  deleteMediaCoverFromDB,
  deletePlaylistFromDB,
  deleteTrackFromDB,
  getAllMediaCoversFromDB,
  getAllPlaylistsFromDB,
  getAllUserTracksFromDB,
  saveMediaCoverToDB,
  savePlaylistToDB,
  saveTrackToDB,
} from './lib/indexedDb';

import { Header } from './components/Header';
import { Titlebar } from './components/Titlebar';
import { PlayerBar } from './components/PlayerBar';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { LibraryView } from './components/LibraryView';
import { PlaylistView } from './components/PlaylistView';
import { SearchView } from './components/SearchView';
import { EQAtmosView } from './components/EQAtmosView';
import { EqualizerModal } from './components/EqualizerModal';
import { ImportFilesModal } from './components/ImportFilesModal';
import { SettingsModal } from './components/SettingsModal';
import { UpNextOverlay } from './components/UpNextOverlay';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import { ArtistModal } from './components/ArtistModal';
import { GlobalShortcutManager } from './components/GlobalShortcutManager';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(INITIAL_TRACKS[0] || null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(INITIAL_TRACKS[0]?.duration || 0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sonora_saved_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return 0.85;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [spatialMode, setSpatialMode] = useState<SpatialMode>('stereo');
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => INITIAL_TRACKS.slice(0, 5));
  const [artistProfiles, setArtistProfiles] = useState<ArtistProfile[]>(() => {
    try {
      const saved = localStorage.getItem('sonora_artist_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [transitionSpeed, setTransitionSpeed] = useState<TransitionSpeed>(() => {
    try {
      const saved = localStorage.getItem('sonora_transition_speed');
      return (saved as TransitionSpeed) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [crossfadeSeconds, setCrossfadeSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sonora_crossfade_seconds');
      return saved !== null ? Number(saved) : 2;
    } catch {
      return 2;
    }
  });

  useEffect(() => {
    audioEngine.setCrossfade(crossfadeSeconds > 0, crossfadeSeconds);
  }, [crossfadeSeconds]);

  const handleSetTransitionSpeed = (speed: TransitionSpeed) => {
    setTransitionSpeed(speed);
    try {
      localStorage.setItem('sonora_transition_speed', speed);
    } catch {
      // fallback
    }
  };

  const handleSetCrossfadeSeconds = (seconds: number) => {
    setCrossfadeSeconds(seconds);
    try {
      localStorage.setItem('sonora_crossfade_seconds', String(seconds));
    } catch {
      // fallback
    }
  };

  const animDuration =
    transitionSpeed === 'disabled'
      ? 0
      : transitionSpeed === 'fast'
      ? 0.15
      : transitionSpeed === 'slow'
      ? 0.6
      : 0.3;

  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [playingContext, setPlayingContext] = useState<string>('Libreria');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');

  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState<boolean>(false);
  const [isUpNextOpen, setIsUpNextOpen] = useState<boolean>(false);
  const [selectedArtistModalName, setSelectedArtistModalName] = useState<string | null>(null);

  const [queue, setQueue] = useState<Track[]>(() => INITIAL_TRACKS.slice(1));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: ToastMessage) => {
    const id = `${toast.id || 'toast'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [{ ...toast, id }, ...prev.slice(0, 2)]);
  }, []);

  const handleCloseToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [accentColor, setAccentColor] = useState<string>(() => {
    try {
      const savedColor = localStorage.getItem('sonora_saved_theme_color');
      if (savedColor && /^#[0-9A-F]{6}$/i.test(savedColor)) {
        return savedColor;
      }
    } catch {}
    return '#1DB954';
  });

  const [bgTheme, setBgTheme] = useState<string>(() => {
    try {
      const savedBg = localStorage.getItem('sonora_saved_bg_theme');
      if (savedBg) return savedBg;
    } catch {}
    return 'classic_dark';
  });

  const palette = useMemo(() => {
    const basePalette = generatePaletteFromHex(accentColor);
    return applyBackgroundTheme(basePalette, bgTheme);
  }, [accentColor, bgTheme]);

  // Load persistent user data from IndexedDB on startup
  useEffect(() => {
    async function loadStoredData() {
      try {
        const deletedTrackIds = new Set<string>(
          JSON.parse(localStorage.getItem('sonora_deleted_track_ids') || '[]')
        );
        const deletedPlaylistIds = new Set<string>(
          JSON.parse(localStorage.getItem('sonora_deleted_playlist_ids') || '[]')
        );

        const storedTracks = await getAllUserTracksFromDB();
        const trackMap = new Map<string, Track>();

        // 1. Initial default tracks (if not deleted by user)
        INITIAL_TRACKS.forEach((t) => {
          if (!deletedTrackIds.has(t.id)) {
            trackMap.set(t.id, t);
          }
        });

        // 2. Overwrite / Add saved tracks from IndexedDB (contains user uploaded tracks, updated lyrics, covers, favorites)
        if (storedTracks && storedTracks.length > 0) {
          storedTracks.forEach((t) => {
            if (!deletedTrackIds.has(t.id)) {
              trackMap.set(t.id, t);
            }
          });
        }

        const mergedTracks = Array.from(trackMap.values());
        setTracks(mergedTracks);

        // Load Playlists
        const storedPlaylists = await getAllPlaylistsFromDB();
        const playlistMap = new Map<string, Playlist>();

        INITIAL_PLAYLISTS.forEach((p) => {
          if (!deletedPlaylistIds.has(p.id)) {
            playlistMap.set(p.id, p);
          }
        });

        if (storedPlaylists && storedPlaylists.length > 0) {
          storedPlaylists.forEach((p) => {
            if (!deletedPlaylistIds.has(p.id) && !p.id.startsWith('pl-album-')) {
              playlistMap.set(p.id, p);
            }
          });
        }

        setPlaylists(Array.from(playlistMap.values()));

        // Load stored media covers (including custom artist photos)
        const storedCovers = await getAllMediaCoversFromDB();
        if (storedCovers && storedCovers.length > 0) {
          const artistCovers = storedCovers.filter((c) => c.type === 'artist' && c.dataUrl);
          if (artistCovers.length > 0) {
            setArtistProfiles((prev) => {
              const profilesMap = new Map<string, ArtistProfile>(
                prev.map((p) => [p.id.toLowerCase(), p])
              );
              artistCovers.forEach((cover) => {
                const artistKey = cover.id.replace('artist-', '').toLowerCase();
                const existing = profilesMap.get(artistKey);
                if (existing) {
                  profilesMap.set(artistKey, { ...existing, coverUrl: cover.dataUrl });
                } else {
                  const artistName = cover.name.replace('Foto Artista: ', '');
                  profilesMap.set(artistKey, {
                    id: artistKey,
                    originalName: artistName,
                    name: artistName,
                    coverUrl: cover.dataUrl,
                  });
                }
              });
              return Array.from(profilesMap.values());
            });
          }
        }
      } catch (e) {
        console.error('Failed to load stored data from IndexedDB:', e);
      }
    }
    loadStoredData();
    // Initialize volume in audio engine on startup
    audioEngine.setVolume(volume);
  }, []);

  // Persist volume state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sonora_saved_volume', volume.toString());
    } catch {
      // ignore
    }
  }, [volume]);

  // Synchronize CSS custom properties on root element with active palette
  useEffect(() => {
    if (palette) {
      document.documentElement.style.setProperty('--md-sys-color-primary', palette.primary);
      document.documentElement.style.setProperty('--md-sys-color-primary-container', palette.primaryContainer);
      document.documentElement.style.setProperty('--md-sys-color-on-primary-container', palette.onPrimaryContainer);
      document.documentElement.style.setProperty('--md-sys-color-glow', palette.glowColor);
    }
  }, [palette]);

  // Synchronize state refs for event handlers to eliminate desync & stale closures
  const currentTrackRef = useRef<Track | null>(currentTrack);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const queueRef = useRef<Track[]>(queue);
  const tracksRef = useRef<Track[]>(tracks);
  const isShuffleRef = useRef<boolean>(isShuffle);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  // Audio Engine time & end listeners
  useEffect(() => {
    audioEngine.setTimeUpdateListener((time, dur) => {
      setCurrentTime(time);
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        const roundedDur = Math.round(dur);
        setDuration(roundedDur);

        const track = currentTrackRef.current;
        if (track) {
          if (Math.abs((track.duration || 0) - roundedDur) > 1) {
            setCurrentTrack((prev) => (prev ? { ...prev, duration: roundedDur } : null));

            setTracks((prev) => {
              let changed = false;
              const updatedTracks = prev.map((t) => {
                if (t.id === track.id && Math.abs((t.duration || 0) - roundedDur) > 1) {
                  changed = true;
                  const updatedTrack = { ...t, duration: roundedDur };
                  saveTrackToDB(updatedTrack);
                  return updatedTrack;
                }
                return t;
              });
              return changed ? updatedTracks : prev;
            });
          }
        }
      }
    });

    audioEngine.setEndedListener(() => {
      handleSkipForward();
    });

    audioEngine.setPlayStateListener((playing) => {
      setIsPlaying(playing);
    });
  }, []);

  // Playback Control Handlers (stable callbacks)
  const handlePlayTrack = useCallback((track: Track, customUpcomingQueue?: Track[], contextName?: string) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setDuration(track.duration);
    audioEngine.loadAndPlay(track.audioUrl, track.genre);
    recordTrackPlay(track);

    if (contextName) {
      setPlayingContext(contextName);
    } else if (track.album) {
      setPlayingContext(track.album);
    } else {
      setPlayingContext(track.artist);
    }

    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 10);
    });

    if (customUpcomingQueue) {
      setQueue(customUpcomingQueue);
    } else {
      const allTracks = tracksRef.current;
      const currentIdx = allTracks.findIndex((t) => t.id === track.id);
      if (currentIdx !== -1) {
        let upcoming = allTracks.slice(currentIdx + 1);
        if (isShuffleRef.current) {
          upcoming = [...upcoming].sort(() => Math.random() - 0.5);
        }
        setQueue(upcoming);
      }
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    const track = currentTrackRef.current;
    if (!track) {
      if (tracksRef.current.length > 0) {
        handlePlayTrack(tracksRef.current[0]);
      }
      return;
    }
    if (isPlayingRef.current) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.resume();
      setIsPlaying(true);
    }
  }, [handlePlayTrack]);

  const handleSkipForward = useCallback(() => {
    const queueList = queueRef.current;
    const allTracks = tracksRef.current;
    const current = currentTrackRef.current;

    if (queueList.length > 0) {
      const nextTrack = queueList[0];
      const remainingQueue = queueList.slice(1);
      handlePlayTrack(nextTrack, remainingQueue);
      return;
    }

    if (allTracks.length === 0) return;
    let nextIdx = 0;
    if (isShuffleRef.current) {
      nextIdx = Math.floor(Math.random() * allTracks.length);
    } else {
      const currentIdx = allTracks.findIndex((t) => t.id === current?.id);
      nextIdx = (currentIdx + 1) % allTracks.length;
    }
    const nextTrack = allTracks[nextIdx];
    handlePlayTrack(nextTrack);
  }, [handlePlayTrack]);

  const handleSkipBack = useCallback(() => {
    const allTracks = tracksRef.current;
    const current = currentTrackRef.current;
    if (allTracks.length === 0) return;
    const currentIdx = allTracks.findIndex((t) => t.id === current?.id);
    const prevIdx = currentIdx <= 0 ? allTracks.length - 1 : currentIdx - 1;
    const prevTrack = allTracks[prevIdx];
    handlePlayTrack(prevTrack);
  }, [handlePlayTrack]);

  const handleSeek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    audioEngine.seek(seconds);
  }, []);

  // MediaSession Metadata sync
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Soundflow',
        artwork: currentTrack.coverUrl
          ? [{ src: currentTrack.coverUrl, sizes: '512x512' }]
          : [],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [currentTrack]);

  // MediaSession Action Handlers setup ONCE
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        handlePlayPause();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('pause', () => {
        handlePlayPause();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handleSkipBack();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleSkipForward();
      });
    } catch {}

    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          handleSeek(details.seekTime);
        }
      });
    } catch {}
  }, [handlePlayPause, handleSkipBack, handleSkipForward, handleSeek]);

  // Sync MediaSession playbackState & positionState with OS
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    if ('setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1.0,
          position: Math.min(duration, Math.max(0, currentTime)),
        });
      } catch {}
    }
  }, [isPlaying, currentTime, duration]);

  // Listen for System Tray menu control events ONCE
  useEffect(() => {
    let unlistenPlay: (() => void) | undefined;
    let unlistenNext: (() => void) | undefined;
    let unlistenPrev: (() => void) | undefined;

    const setupTrayListeners = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenPlay = await listen('tray-play-pause', () => {
          handlePlayPause();
        });
        unlistenNext = await listen('tray-next', () => {
          handleSkipForward();
        });
        unlistenPrev = await listen('tray-prev', () => {
          handleSkipBack();
        });
      } catch {
        // Ignored outside Tauri
      }
    };

    setupTrayListeners();

    return () => {
      if (unlistenPlay) unlistenPlay();
      if (unlistenNext) unlistenNext();
      if (unlistenPrev) unlistenPrev();
    };
  }, [handlePlayPause, handleSkipForward, handleSkipBack]);

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handleToggleFavorite = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, isFavorite: !t.isFavorite };
          saveTrackToDB(updated);
          return updated;
        }
        return t;
      })
    );
  };

  const handleToggleSpatialMode = () => {
    const modes: SpatialMode[] = ['stereo', 'dolby_atmos', 'cinema_surround', 'concert_hall'];
    const currentIdx = modes.indexOf(spatialMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setSpatialMode(nextMode);
    audioEngine.setSpatialMode(nextMode);
  };

  const handleSetSpatialMode = (mode: SpatialMode) => {
    setSpatialMode(mode);
    audioEngine.setSpatialMode(mode);
  };

  const handleSetEqualizerBands = (bands: EqualizerBands) => {
    audioEngine.setEqualizer(bands);
  };

  const handleUpdate3DPos = (pos: Spatial3DPosition) => {
    audioEngine.update3DPosition(pos);
  };

  // Playlist actions
  const handleAddTrackToPlaylist = async (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId && !pl.trackIds.includes(trackId)) {
          const updated = { ...pl, trackIds: [...pl.trackIds, trackId] };
          savePlaylistToDB(updated);
          return updated;
        }
        return pl;
      })
    );
  };

  const handleCreatePlaylist = async (name: string, description: string, colorTag: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      trackIds: [],
      colorTag,
      createdAt: new Date().toISOString().split('T')[0],
      isSmart: false,
    };
    setPlaylists((prev) => [...prev, newPl]);
    await savePlaylistToDB(newPl);
  };

  const handleUpdatePlaylist = async (playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const updated = { ...pl, ...updates };
          savePlaylistToDB(updated);
          return updated;
        }
        return pl;
      })
    );
  };

  const handleSetThemeColor = (colorHex: string) => {
    setAccentColor(colorHex);
    try {
      localStorage.setItem('sonora_saved_theme_color', colorHex);
    } catch {}
  };

  const handleSetBgTheme = (newBgTheme: string) => {
    setBgTheme(newBgTheme);
    try {
      localStorage.setItem('sonora_saved_bg_theme', newBgTheme);
    } catch {}
  };

  const handleClearLibrary = async () => {
    audioEngine.pause();
    tracks.forEach((t) => {
      if (t.audioUrl && t.audioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(t.audioUrl);
        } catch {}
      }
    });
    setTracks([]);
    setPlaylists([]);
    setQueue([]);
    setRecentlyPlayed([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    localStorage.removeItem('sonora_deleted_track_ids');
    localStorage.removeItem('sonora_deleted_playlist_ids');
    localStorage.removeItem('sonora_artist_profiles');
    setArtistProfiles([]);
    await clearAllDatabaseData();
  };

  const handleClearOrphanedMetadata = async () => {
    // 1. Identify orphaned artist profiles that no longer have any associated tracks
    const orphanedProfiles: ArtistProfile[] = [];
    const remainingProfiles: ArtistProfile[] = [];

    artistProfiles.forEach((profile) => {
      const hasMatchingTrack = tracks.some(
        (t) =>
          isArtistMatch(t.artist, profile.originalName, profile.name) ||
          t.artist.trim().toLowerCase() === profile.originalName.trim().toLowerCase() ||
          t.artist.trim().toLowerCase() === profile.name.trim().toLowerCase()
      );
      if (hasMatchingTrack) {
        remainingProfiles.push(profile);
      } else {
        orphanedProfiles.push(profile);
      }
    });

    if (orphanedProfiles.length > 0) {
      setArtistProfiles(remainingProfiles);
      try {
        localStorage.setItem('sonora_artist_profiles', JSON.stringify(remainingProfiles));
      } catch (e) {
        console.error('Error updating artist profiles in localStorage:', e);
      }
    }

    // 2. Identify orphaned media covers/tags in IndexedDB
    let removedCoversCount = 0;
    try {
      const allCovers = await getAllMediaCoversFromDB();
      for (const cover of allCovers) {
        let isOrphaned = false;
        if (cover.type === 'artist') {
          const hasTrack = tracks.some(
            (t) =>
              isArtistMatch(t.artist, cover.id, cover.name) ||
              t.artist.trim().toLowerCase() === cover.name.trim().toLowerCase()
          );
          const hasProfile = remainingProfiles.some(
            (p) =>
              p.id === cover.id ||
              p.originalName.trim().toLowerCase() === cover.name.trim().toLowerCase() ||
              p.name.trim().toLowerCase() === cover.name.trim().toLowerCase()
          );
          if (!hasTrack && !hasProfile) {
            isOrphaned = true;
          }
        } else if (cover.type === 'album') {
          const hasTrack = tracks.some(
            (t) =>
              (t.album && t.album.trim().toLowerCase() === cover.name.trim().toLowerCase()) ||
              t.album === cover.id
          );
          if (!hasTrack) {
            isOrphaned = true;
          }
        } else if (cover.type === 'playlist') {
          const hasPlaylist = playlists.some(
            (p) => p.id === cover.id || p.name.trim().toLowerCase() === cover.name.trim().toLowerCase()
          );
          if (!hasPlaylist) {
            isOrphaned = true;
          }
        }

        if (isOrphaned) {
          await deleteMediaCoverFromDB(cover.id);
          removedCoversCount++;
        }
      }
    } catch (e) {
      console.error('Error scanning IndexedDB media covers:', e);
    }

    const totalCleaned = orphanedProfiles.length + removedCoversCount;

    if (totalCleaned > 0) {
      showToast({
        id: `clear-metadata-${Date.now()}`,
        title: 'Metadata Orfani Puliti',
        description: `Rimossi ${orphanedProfiles.length} profili artista e ${removedCoversCount} copertine/tag orfani senza brani associati.`,
        type: 'success',
      });
    } else {
      showToast({
        id: `clear-metadata-${Date.now()}`,
        title: 'Database Pulito',
        description: 'Nessun metadata o profilo orfano riscontrato.',
        type: 'info',
      });
    }

    return {
      removedProfilesCount: orphanedProfiles.length,
      removedCoversCount,
      totalCleaned,
    };
  };

  const handleDeletePlaylist = async (id: string) => {
    const playlistToDelete = playlists.find((p) => p.id === id);
    if (!playlistToDelete) return;

    const playlistIndex = playlists.findIndex((p) => p.id === id);

    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(updated[0]?.id || 'pl-favorites');
      }
      return updated;
    });

    await deletePlaylistFromDB(id);

    try {
      const deleted = JSON.parse(localStorage.getItem('sonora_deleted_playlist_ids') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sonora_deleted_playlist_ids', JSON.stringify(deleted));
      }
    } catch {}

    showToast({
      id: `delete-playlist-${id}-${Date.now()}`,
      title: `Playlist "${playlistToDelete.name}" eliminata`,
      description: 'Tocca Annulla per ripristinarla.',
      type: 'delete',
      action: {
        label: 'Annulla',
        onClick: async () => {
          setPlaylists((prev) => {
            const next = [...prev];
            if (playlistIndex >= 0 && playlistIndex <= next.length) {
              next.splice(playlistIndex, 0, playlistToDelete);
            } else {
              next.push(playlistToDelete);
            }
            return next;
          });

          await savePlaylistToDB(playlistToDelete);

          try {
            const deleted = JSON.parse(localStorage.getItem('sonora_deleted_playlist_ids') || '[]');
            const updatedDeleted = deleted.filter((dId: string) => dId !== id);
            localStorage.setItem('sonora_deleted_playlist_ids', JSON.stringify(updatedDeleted));
          } catch {}

          showToast({
            id: `restore-playlist-${id}-${Date.now()}`,
            title: `Playlist "${playlistToDelete.name}" ripristinata`,
            type: 'success',
            duration: 3000,
          });
        },
      },
    });
  };

  const handleRemoveTrackFromPlaylist = async (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const updated = { ...pl, trackIds: pl.trackIds.filter((t) => t !== trackId) };
          savePlaylistToDB(updated);
          return updated;
        }
        return pl;
      })
    );
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    let plTracks: Track[] = [];
    if (playlist.isSmart) {
      if (playlist.smartType === 'favorites') {
        plTracks = tracks.filter((t) => t.isFavorite);
      } else if (playlist.smartType === 'flac') {
        plTracks = tracks.filter((t) => t.format === 'FLAC');
      } else if (playlist.smartType === 'atmos') {
        plTracks = tracks.filter((t) => t.format === 'Dolby Atmos');
      } else if (playlist.smartType === 'recent') {
        plTracks = [...tracks];
      }
    } else {
      plTracks = tracks.filter((t) => playlist.trackIds.includes(t.id));
    }

    if (plTracks.length > 0) {
      handlePlayTrack(plTracks[0], plTracks.slice(1), playlist.name);
    }
  };

  // Queue actions
  const handleReorderQueue = (newQueue: Track[]) => {
    setQueue(newQueue);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    const backupQueue = [...queue];
    setQueue([]);

    showToast({
      id: `clear-queue-${Date.now()}`,
      title: `Coda svuotata (${backupQueue.length} ${backupQueue.length === 1 ? 'brano' : 'brani'})`,
      description: 'Tocca Annulla per ripristinare la lista.',
      type: 'delete',
      action: {
        label: 'Annulla',
        onClick: () => {
          setQueue(backupQueue);
          showToast({
            id: `restore-queue-${Date.now()}`,
            title: 'Coda di riproduzione ripristinata',
            type: 'success',
            duration: 3000,
          });
        },
      },
    });
  };

  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const handleSelectPlaylistFromHome = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setActiveTab('playlists');
  };

  const handleUpdateTrackLyrics = async (trackId: string, lyrics: LyricLine[]) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const updated = { ...t, lyrics };
          saveTrackToDB(updated);
          return updated;
        }
        return t;
      })
    );
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, lyrics } : null));
    }
  };

  const handleUpdateArtist = (
    originalName: string,
    updated: { name: string; coverUrl: string; bio?: string }
  ) => {
    const key = getPrimaryArtist(originalName).toLowerCase();
    const newKey = getPrimaryArtist(updated.name).toLowerCase();
    const newProfile: ArtistProfile = {
      id: newKey,
      originalName,
      name: updated.name,
      coverUrl: updated.coverUrl,
      bio: updated.bio,
    };

    setArtistProfiles((prev) => {
      const filtered = prev.filter(
        (p) =>
          p.id !== key &&
          p.id !== newKey &&
          p.originalName.toLowerCase() !== key &&
          p.name.toLowerCase() !== key
      );
      const next = [...filtered, newProfile];
      try {
        localStorage.setItem('sonora_artist_profiles', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage error on artist profiles:', e);
      }
      return next;
    });

    if (updated.coverUrl) {
      saveMediaCoverToDB({
        id: `artist-${newKey}`,
        name: `Foto Artista: ${updated.name}`,
        type: 'artist',
        dataUrl: updated.coverUrl,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});

      if (key !== newKey) {
        saveMediaCoverToDB({
          id: `artist-${key}`,
          name: `Foto Artista: ${updated.name}`,
          type: 'artist',
          dataUrl: updated.coverUrl,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    // Keep the ArtistModal open under the updated artist name if currently open
    if (selectedArtistModalName) {
      const selKey = getPrimaryArtist(selectedArtistModalName).toLowerCase();
      if (selKey === key || selKey === newKey || selectedArtistModalName.toLowerCase() === originalName.toLowerCase()) {
        setSelectedArtistModalName(updated.name);
      }
    }

    // If artist name changed, sync all tracks belonging to this primary artist
    if (updated.name !== originalName) {
      setTracks((prev) =>
        prev.map((t) => {
          if (isArtistMatch(t.artist, originalName)) {
            const updatedTrack = { ...t, artist: updated.name };
            saveTrackToDB(updatedTrack);
            return updatedTrack;
          }
          return t;
        })
      );
    }
  };

  const handleDeleteArtist = async (artistName: string, explicitTrackIds?: string[]) => {
    const key = getPrimaryArtist(artistName).toLowerCase();

    // Find all tracks belonging strictly to this artist or matching explicit track IDs
    let tracksToDelete: Track[] = [];
    if (explicitTrackIds && explicitTrackIds.length > 0) {
      const idSet = new Set(explicitTrackIds);
      tracksToDelete = tracks.filter((t) => idSet.has(t.id));
    } else {
      tracksToDelete = tracks.filter(
        (t) =>
          isArtistMatch(t.artist, artistName) ||
          getPrimaryArtist(t.artist).toLowerCase() === key ||
          t.artist.toLowerCase().includes(key)
      );
    }

    if (tracksToDelete.length === 0) return;

    const trackIdsToDelete = new Set(tracksToDelete.map((t) => t.id));

    // Backup artist profile if present
    const artistProfileBackup = artistProfiles.find(
      (p) => p.id === key || p.originalName.toLowerCase() === key || p.name.toLowerCase() === key
    );

    // Backup playlist track associations
    const playlistTrackAssociationsBackup = playlists.map((pl) => ({
      playlistId: pl.id,
      removedTrackIds: pl.trackIds.filter((id) => trackIdsToDelete.has(id)),
    }));

    // Store deleted track IDs so default tracks don't reappear on refresh
    try {
      const deleted = JSON.parse(localStorage.getItem('sonora_deleted_track_ids') || '[]');
      trackIdsToDelete.forEach((id) => {
        if (!deleted.includes(id)) deleted.push(id);
      });
      localStorage.setItem('sonora_deleted_track_ids', JSON.stringify(deleted));
    } catch {}

    // Remove tracks from state
    setTracks((prev) => prev.filter((t) => !trackIdsToDelete.has(t.id)));

    // Delete from IndexedDB and revoke Blob URLs
    for (const tr of tracksToDelete) {
      if (tr.audioUrl && tr.audioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(tr.audioUrl);
        } catch {}
      }
      await deleteTrackFromDB(tr.id);
    }

    // Remove track IDs from all playlists
    setPlaylists((prev) =>
      prev.map((pl) => {
        const updatedTrackIds = pl.trackIds.filter((id) => !trackIdsToDelete.has(id));
        const updatedPl = { ...pl, trackIds: updatedTrackIds };
        savePlaylistToDB(updatedPl);
        return updatedPl;
      })
    );

    // Remove from artistProfiles
    setArtistProfiles((prev) => {
      const next = prev.filter(
        (p) => p.id !== key && p.originalName.toLowerCase() !== key && p.name.toLowerCase() !== key
      );
      try {
        localStorage.setItem('sonora_artist_profiles', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Clean up queue & recentlyPlayed
    setQueue((prev) => prev.filter((t) => !trackIdsToDelete.has(t.id)));
    setRecentlyPlayed((prev) => prev.filter((t) => !trackIdsToDelete.has(t.id)));

    // If current playing track was deleted, stop playback
    if (currentTrack && trackIdsToDelete.has(currentTrack.id)) {
      audioEngine.pause();
      const remainingTracks = tracks.filter((t) => !trackIdsToDelete.has(t.id));
      if (remainingTracks.length > 0) {
        setCurrentTrack(remainingTracks[0]);
        setDuration(remainingTracks[0].duration);
      } else {
        setCurrentTrack(null);
      }
      setIsPlaying(false);
    }

    const displayName = getPrimaryArtist(artistName);

    showToast({
      id: `delete-artist-${key}-${Date.now()}`,
      title: `Artista "${displayName}" e ${tracksToDelete.length} brani eliminati`,
      description: 'Tocca Annulla per ripristinarli.',
      type: 'delete',
      action: {
        label: 'Annulla',
        onClick: async () => {
          // Restore tracks in state
          setTracks((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const restoredTracks = tracksToDelete.filter((t) => !existingIds.has(t.id));
            return [...prev, ...restoredTracks];
          });

          // Remove from deleted_track_ids
          try {
            const deleted = JSON.parse(localStorage.getItem('sonora_deleted_track_ids') || '[]');
            const updatedDeleted = deleted.filter((id: string) => !trackIdsToDelete.has(id));
            localStorage.setItem('sonora_deleted_track_ids', JSON.stringify(updatedDeleted));
          } catch {}

          // Save tracks back to DB
          for (const tr of tracksToDelete) {
            await saveTrackToDB(tr);
          }

          // Restore artist profile if present
          if (artistProfileBackup) {
            setArtistProfiles((prev) => {
              const exists = prev.some((p) => p.id === artistProfileBackup.id);
              if (!exists) {
                const updated = [...prev, artistProfileBackup];
                try {
                  localStorage.setItem('sonora_artist_profiles', JSON.stringify(updated));
                } catch {}
                return updated;
              }
              return prev;
            });
          }

          // Restore playlist track associations
          setPlaylists((prev) =>
            prev.map((pl) => {
              const assoc = playlistTrackAssociationsBackup.find((a) => a.playlistId === pl.id);
              if (assoc && assoc.removedTrackIds.length > 0) {
                const newTrackIds = [...pl.trackIds];
                assoc.removedTrackIds.forEach((tId) => {
                  if (!newTrackIds.includes(tId)) {
                    newTrackIds.push(tId);
                  }
                });
                const updatedPl = { ...pl, trackIds: newTrackIds };
                savePlaylistToDB(updatedPl);
                return updatedPl;
              }
              return pl;
            })
          );

          showToast({
            id: `restore-artist-${key}-${Date.now()}`,
            title: `Artista "${displayName}" e brani ripristinati`,
            type: 'success',
            duration: 3000,
          });
        },
      },
    });
  };

  // Local tracks upload & delete
  const handleAddImportedTracks = async (
    newTracks: Track[]
  ) => {
    setTracks((prev) => {
      const seen = new Set(prev.map((t) => t.id));
      const uniqueNew = newTracks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      return [...uniqueNew, ...prev];
    });
    for (const tr of newTracks) {
      await saveTrackToDB(tr);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    const trackToDelete = tracks.find((t) => t.id === id);
    if (!trackToDelete) return;

    if (trackToDelete.audioUrl && trackToDelete.audioUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(trackToDelete.audioUrl);
      } catch {}
    }

    const trackIndex = tracks.findIndex((t) => t.id === id);

    setTracks((prev) => prev.filter((t) => t.id !== id));
    await deleteTrackFromDB(id);

    try {
      const deleted = JSON.parse(localStorage.getItem('sonora_deleted_track_ids') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sonora_deleted_track_ids', JSON.stringify(deleted));
      }
    } catch {}

    const playlistTrackAssociationsBackup = playlists.map((pl) => ({
      playlistId: pl.id,
      hadTrack: pl.trackIds.includes(id),
    }));

    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.trackIds.includes(id)) {
          const updated = { ...pl, trackIds: pl.trackIds.filter((tId) => tId !== id) };
          savePlaylistToDB(updated);
          return updated;
        }
        return pl;
      })
    );

    // Clean up queue & recentlyPlayed
    setQueue((prev) => prev.filter((t) => t.id !== id));
    setRecentlyPlayed((prev) => prev.filter((t) => t.id !== id));

    // If current playing track was deleted, stop playback and switch
    if (currentTrack && currentTrack.id === id) {
      audioEngine.pause();
      const remainingTracks = tracks.filter((t) => t.id !== id);
      if (remainingTracks.length > 0) {
        setCurrentTrack(remainingTracks[0]);
        setDuration(remainingTracks[0].duration);
      } else {
        setCurrentTrack(null);
      }
      setIsPlaying(false);
    }

    showToast({
      id: `delete-track-${id}-${Date.now()}`,
      title: `Brano "${trackToDelete.title}" eliminato`,
      description: 'Tocca Annulla per ripristinarlo.',
      type: 'delete',
      action: {
        label: 'Annulla',
        onClick: async () => {
          setTracks((prev) => {
            const next = [...prev];
            if (trackIndex >= 0 && trackIndex <= next.length) {
              next.splice(trackIndex, 0, trackToDelete);
            } else {
              next.push(trackToDelete);
            }
            return next;
          });

          await saveTrackToDB(trackToDelete);

          try {
            const deleted = JSON.parse(localStorage.getItem('sonora_deleted_track_ids') || '[]');
            const updatedDeleted = deleted.filter((dId: string) => dId !== id);
            localStorage.setItem('sonora_deleted_track_ids', JSON.stringify(updatedDeleted));
          } catch {}

          setPlaylists((prev) =>
            prev.map((pl) => {
              const assoc = playlistTrackAssociationsBackup.find((a) => a.playlistId === pl.id);
              if (assoc && assoc.hadTrack && !pl.trackIds.includes(id)) {
                const updated = { ...pl, trackIds: [...pl.trackIds, id] };
                savePlaylistToDB(updated);
                return updated;
              }
              return pl;
            })
          );

          showToast({
            id: `restore-track-${id}-${Date.now()}`,
            title: `Brano "${trackToDelete.title}" ripristinato`,
            type: 'success',
            duration: 3000,
          });
        },
      },
    });
  };

  return (
    <div
      className={`h-screen w-screen max-w-full overflow-hidden text-slate-100 flex flex-col select-none transition-colors duration-500 ${
        transitionSpeed === 'disabled'
          ? 'disable-transitions'
          : transitionSpeed === 'fast'
          ? 'anim-fast'
          : transitionSpeed === 'slow'
          ? 'anim-slow'
          : ''
      }`}
      style={{ backgroundColor: palette.surface }}
    >
      {/* Global Keyboard Shortcut & Hardware Media Key Manager */}
      <GlobalShortcutManager
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        isFullScreenPlayerOpen={isFullScreenOpen}
        onTogglePlayPause={handlePlayPause}
        onSkipForward={handleSkipForward}
        onSkipBack={handleSkipBack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleFavorite={handleToggleFavorite}
        onToggleShuffle={() => setIsShuffle((prev) => !prev)}
        onToggleRepeat={() => setIsRepeat((prev) => !prev)}
        onToggleFullScreen={() => setIsFullScreenOpen((prev) => !prev)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        showToast={showToast}
      />

      {/* Shortcuts Cheat Sheet Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
        palette={palette}
      />

      {/* Custom Tauri Titlebar */}
      <Titlebar
        palette={palette}
        currentTrackTitle={currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : undefined}
        isPlaying={isPlaying}
      />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        palette={palette}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenEqualizerModal={() => setIsEqualizerOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        trackCount={tracks.length}
      />

      {/* Main Tab Content with internal smooth scrolling */}
      <main className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto min-h-0 min-w-0 px-2 sm:px-4 lg:px-6 pb-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: transitionSpeed === 'disabled' ? 0 : 12, filter: transitionSpeed === 'disabled' ? 'none' : 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: transitionSpeed === 'disabled' ? 0 : -12, filter: transitionSpeed === 'disabled' ? 'none' : 'blur(4px)' }}
            transition={{ duration: animDuration, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {activeTab === 'library' && (
              <LibraryView
                tracks={tracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                playlists={playlists}
                recentlyPlayed={recentlyPlayed}
                artistProfiles={artistProfiles}
                searchQuery={searchQuery}
                palette={palette}
                onPlayTrack={handlePlayTrack}
                onToggleFavorite={handleToggleFavorite}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                onDeleteTrack={handleDeleteTrack}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onSelectPlaylist={handleSelectPlaylistFromHome}
                onPlayPlaylist={handlePlayPlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                onUpdateArtist={handleUpdateArtist}
                onDeleteArtist={handleDeleteArtist}
                onSelectArtist={(artistName) => setSelectedArtistModalName(artistName)}
              />
            )}

            {activeTab === 'playlists' && (
              <PlaylistView
                playlists={playlists}
                tracks={tracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                palette={palette}
                selectedPlaylistId={selectedPlaylistId}
                onSelectPlaylist={setSelectedPlaylistId}
                onCreatePlaylist={handleCreatePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                onUpdatePlaylist={handleUpdatePlaylist}
                onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                onPlayTrack={handlePlayTrack}
                onPlayPlaylist={handlePlayPlaylist}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {activeTab === 'search' && (
              <SearchView
                tracks={tracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                palette={palette}
                onPlayTrack={handlePlayTrack}
                onToggleFavorite={handleToggleFavorite}
                onSelectArtist={(artistName) => setSelectedArtistModalName(artistName)}
              />
            )}

            {activeTab === 'eq_atmos' && (
              <EQAtmosView
                spatialMode={spatialMode}
                palette={palette}
                onSetSpatialMode={handleSetSpatialMode}
                onSetEqualizerBands={handleSetEqualizerBands}
                onUpdate3DPos={handleUpdate3DPos}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        spatialMode={spatialMode}
        palette={palette}
        queueCount={queue.length}
        onPlayPause={handlePlayPause}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={() => setIsRepeat(!isRepeat)}
        onToggleFavorite={handleToggleFavorite}
        onOpenFullScreen={() => setIsFullScreenOpen(true)}
        onOpenEqualizer={() => setActiveTab('eq_atmos')}
        onToggleSpatialMode={handleToggleSpatialMode}
        onOpenUpNext={() => setIsUpNextOpen(true)}
      />

      {/* Full Screen Player */}
      <FullScreenPlayer
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        spatialMode={spatialMode}
        palette={palette}
        playingContext={playingContext}
        onPlayPause={handlePlayPause}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleFavorite={handleToggleFavorite}
        onOpenEqualizer={() => {
          setIsFullScreenOpen(false);
          setActiveTab('eq_atmos');
        }}
        onToggleSpatialMode={handleToggleSpatialMode}
        onUpdateTrackLyrics={handleUpdateTrackLyrics}
        onOpenUpNext={() => setIsUpNextOpen(true)}
      />

      {/* Up Next / Play Queue Overlay */}
      <UpNextOverlay
        isOpen={isUpNextOpen}
        onClose={() => setIsUpNextOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        queue={queue}
        palette={palette}
        allTracks={tracks}
        onPlayTrack={handlePlayTrack}
        onPlayPause={handlePlayPause}
        onReorderQueue={handleReorderQueue}
        onRemoveFromQueue={handleRemoveFromQueue}
        onClearQueue={handleClearQueue}
        onAddToQueue={handleAddToQueue}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Equalizer & Spatial DSP Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        spatialMode={spatialMode}
        palette={palette}
        transitionSpeed={transitionSpeed}
        onSetSpatialMode={handleSetSpatialMode}
        onSetEqualizerBands={handleSetEqualizerBands}
        onUpdate3DPos={handleUpdate3DPos}
      />

      {/* Import Local FLAC Files Modal */}
      <ImportFilesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        palette={palette}
        tracks={tracks}
        transitionSpeed={transitionSpeed}
        onAddTracks={handleAddImportedTracks}
        onUpdateTrackLyrics={handleUpdateTrackLyrics}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        palette={palette}
        onSelectThemeColor={handleSetThemeColor}
        bgTheme={bgTheme}
        onSelectBgTheme={handleSetBgTheme}
        onOpenImportModal={() => {
          setIsSettingsOpen(false);
          setIsImportModalOpen(true);
        }}
        onClearLibrary={handleClearLibrary}
        onClearOrphanedMetadata={handleClearOrphanedMetadata}
        trackCount={tracks.length}
        tracks={tracks}
        transitionSpeed={transitionSpeed}
        onSetTransitionSpeed={handleSetTransitionSpeed}
        crossfadeSeconds={crossfadeSeconds}
        onSetCrossfadeSeconds={handleSetCrossfadeSeconds}
      />

      {/* Toast Notification Container with Undo capability */}
      <ToastContainer
        toasts={toasts}
        onCloseToast={handleCloseToast}
        palette={palette}
      />

      {/* Artist Profile & Discography Modal */}
      <ArtistModal
        isOpen={!!selectedArtistModalName}
        artistName={selectedArtistModalName}
        artistProfile={artistProfiles?.find(
          (ap) =>
            (ap.originalName && ap.originalName.toLowerCase() === selectedArtistModalName?.toLowerCase()) ||
            (ap.name && ap.name.toLowerCase() === selectedArtistModalName?.toLowerCase()) ||
            (ap.id && ap.id === selectedArtistModalName?.toLowerCase())
        )}
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        palette={palette}
        playlists={playlists}
        transitionSpeed={transitionSpeed}
        onClose={() => setSelectedArtistModalName(null)}
        onPlayTrack={handlePlayTrack}
        onToggleFavorite={handleToggleFavorite}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onUpdateArtist={handleUpdateArtist}
        onDeleteArtist={handleDeleteArtist}
      />

      {/* Global Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
        palette={palette}
        transitionSpeed={transitionSpeed}
      />

    </div>
  );
}
