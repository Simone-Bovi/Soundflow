import React, { useEffect, useCallback, useRef } from 'react';
import { Track } from '../types';

interface GlobalShortcutManagerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  isFullScreenPlayerOpen: boolean;
  onTogglePlayPause: () => void;
  onSkipForward: () => void;
  onSkipBack: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFavorite?: (id: string) => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  onToggleFullScreen?: () => void;
  onOpenShortcutsHelp?: () => void;
  showToast?: (toast: { id?: string; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }) => void;
}

export const GlobalShortcutManager: React.FC<GlobalShortcutManagerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  isRepeat,
  isFullScreenPlayerOpen,
  onTogglePlayPause,
  onSkipForward,
  onSkipBack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFullScreen,
  onOpenShortcutsHelp,
  showToast,
}) => {
  // Keep latest refs to avoid stale closures in event listeners
  const refs = useRef({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    isFullScreenPlayerOpen,
    onTogglePlayPause,
    onSkipForward,
    onSkipBack,
    onSeek,
    onVolumeChange,
    onToggleMute,
    onToggleFavorite,
    onToggleShuffle,
    onToggleRepeat,
    onToggleFullScreen,
    onOpenShortcutsHelp,
    showToast,
  });

  useEffect(() => {
    refs.current = {
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      isShuffle,
      isRepeat,
      isFullScreenPlayerOpen,
      onTogglePlayPause,
      onSkipForward,
      onSkipBack,
      onSeek,
      onVolumeChange,
      onToggleMute,
      onToggleFavorite,
      onToggleShuffle,
      onToggleRepeat,
      onToggleFullScreen,
      onOpenShortcutsHelp,
      showToast,
    };
  });

  // 1. NAVIGATOR MEDIASESSION HANDLERS (OS-Level Global Media Keys & Background Controls)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      // Action: Play
      navigator.mediaSession.setActionHandler('play', () => {
        try {
          if (!refs.current.isPlaying) {
            refs.current.onTogglePlayPause();
          }
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession play:', err);
        }
      });

      // Action: Pause
      navigator.mediaSession.setActionHandler('pause', () => {
        try {
          if (refs.current.isPlaying) {
            refs.current.onTogglePlayPause();
          }
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession pause:', err);
        }
      });

      // Action: Previous Track
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        try {
          refs.current.onSkipBack();
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession previoustrack:', err);
        }
      });

      // Action: Next Track
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        try {
          refs.current.onSkipForward();
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession nexttrack:', err);
        }
      });

      // Action: Seek Backward (-10s)
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        try {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.max(0, refs.current.currentTime - skipTime);
          refs.current.onSeek(newTime);
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession seekbackward:', err);
        }
      });

      // Action: Seek Forward (+10s)
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        try {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.min(refs.current.duration, refs.current.currentTime + skipTime);
          refs.current.onSeek(newTime);
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession seekforward:', err);
        }
      });

      // Action: Seek To
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        try {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            refs.current.onSeek(details.seekTime);
          }
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession seekto:', err);
        }
      });

      // Action: Stop
      navigator.mediaSession.setActionHandler('stop', () => {
        try {
          if (refs.current.isPlaying) {
            refs.current.onTogglePlayPause();
          }
        } catch (err) {
          console.error('[GlobalShortcut Error] Fallimento handler MediaSession stop:', err);
        }
      });
    } catch (globalMediaErr) {
      console.error('[GlobalShortcut Error] Errore configurazione MediaSession Action Handlers:', globalMediaErr);
    }

    return () => {
      try {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
          navigator.mediaSession.setActionHandler('seekto', null);
          navigator.mediaSession.setActionHandler('stop', null);
        }
      } catch (cleanupErr) {
        console.error('[GlobalShortcut Error] Errore rimozione handler MediaSession:', cleanupErr);
      }
    };
  }, []);

  // Update MediaSession Position State dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      if (
        'setPositionState' in navigator.mediaSession &&
        duration &&
        !isNaN(duration) &&
        isFinite(duration) &&
        duration > 0
      ) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      }
    } catch (err) {
      console.error('[GlobalShortcut Error] Errore aggiornamento setPositionState:', err);
    }
  }, [currentTime, duration]);

  // 2. IN-APP KEYBOARD SHORTCUTS LISTENER (Keyboard events)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    try {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('input') !== null ||
          target.closest('textarea') !== null);

      // Hardware Media Keys (Always captured regardless of focus)
      switch (e.code) {
        case 'MediaPlayPause':
          e.preventDefault();
          refs.current.onTogglePlayPause();
          return;

        case 'MediaTrackNext':
          e.preventDefault();
          refs.current.onSkipForward();
          return;

        case 'MediaTrackPrevious':
          e.preventDefault();
          refs.current.onSkipBack();
          return;

        case 'AudioVolumeUp':
          e.preventDefault();
          {
            const newVol = Math.min(1, refs.current.volume + 0.05);
            refs.current.onVolumeChange(newVol);
          }
          return;

        case 'AudioVolumeDown':
          e.preventDefault();
          {
            const newVol = Math.max(0, refs.current.volume - 0.05);
            refs.current.onVolumeChange(newVol);
          }
          return;

        case 'AudioVolumeMute':
          e.preventDefault();
          refs.current.onToggleMute();
          return;

        default:
          break;
      }

      // If user is currently typing in an input field, do not block typing keys
      if (isInput) return;

      // Key combinations and non-input shortcuts
      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        refs.current.onTogglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey || e.altKey) {
          // Shift/Alt + ArrowRight = Next track
          refs.current.onSkipForward();
        } else {
          // ArrowRight = Seek forward 5s
          const newTime = Math.min(refs.current.duration, refs.current.currentTime + 5);
          refs.current.onSeek(newTime);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey || e.altKey) {
          // Shift/Alt + ArrowLeft = Prev track
          refs.current.onSkipBack();
        } else {
          // ArrowLeft = Seek backward 5s
          const newTime = Math.max(0, refs.current.currentTime - 5);
          refs.current.onSeek(newTime);
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(1, Number((refs.current.volume + 0.05).toFixed(2)));
        refs.current.onVolumeChange(newVol);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(0, Number((refs.current.volume - 0.05).toFixed(2)));
        refs.current.onVolumeChange(newVol);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        refs.current.onToggleMute();
      } else if (e.code === 'KeyL' && refs.current.currentTrack && refs.current.onToggleFavorite) {
        e.preventDefault();
        refs.current.onToggleFavorite(refs.current.currentTrack.id);
      } else if (e.code === 'KeyS' && refs.current.onToggleShuffle) {
        e.preventDefault();
        refs.current.onToggleShuffle();
      } else if (e.code === 'KeyR' && refs.current.onToggleRepeat) {
        e.preventDefault();
        refs.current.onToggleRepeat();
      } else if (e.code === 'KeyF' && refs.current.onToggleFullScreen) {
        e.preventDefault();
        refs.current.onToggleFullScreen();
      } else if ((e.key === '?' || (e.shiftKey && e.code === 'Slash')) && refs.current.onOpenShortcutsHelp) {
        e.preventDefault();
        refs.current.onOpenShortcutsHelp();
      }
    } catch (err) {
      console.error('[GlobalShortcut Error] Errore gestione evento KeyDown:', err);
    }
  }, []);

  useEffect(() => {
    try {
      window.addEventListener('keydown', handleKeyDown);
    } catch (err) {
      console.error('[GlobalShortcut Error] Errore aggiunta listener keydown:', err);
    }

    return () => {
      try {
        window.removeEventListener('keydown', handleKeyDown);
      } catch (err) {
        console.error('[GlobalShortcut Error] Errore rimozione listener keydown:', err);
      }
    };
  }, [handleKeyDown]);

  // 3. TAURI GLOBAL SHORTCUT LISTENER (For background desktop hardware control in Tauri environment)
  useEffect(() => {
    let unlistenTauriEvent: (() => void) | undefined;

    const initTauriGlobalShortcuts = async () => {
      try {
        if (typeof window === 'undefined') return;
        const winAny = window as any;

        // Check if Tauri is present
        if (winAny.__TAURI__) {
          console.log('[GlobalShortcut Manager] Inizializzazione supporto Tastiera Tauri in background...');

          // Check if custom global shortcut event emitted by Tauri backend
          if (winAny.__TAURI__.event && typeof winAny.__TAURI__.event.listen === 'function') {
            unlistenTauriEvent = await winAny.__TAURI__.event.listen('tauri-media-shortcut', (event: any) => {
              try {
                const action = event.payload?.action || event.payload;
                console.log('[GlobalShortcut Manager] Ricevuta scorciatoia globale Tauri:', action);

                if (action === 'play_pause') {
                  refs.current.onTogglePlayPause();
                } else if (action === 'next_track') {
                  refs.current.onSkipForward();
                } else if (action === 'prev_track') {
                  refs.current.onSkipBack();
                } else if (action === 'volume_up') {
                  const newVol = Math.min(1, refs.current.volume + 0.05);
                  refs.current.onVolumeChange(newVol);
                } else if (action === 'volume_down') {
                  const newVol = Math.max(0, refs.current.volume - 0.05);
                  refs.current.onVolumeChange(newVol);
                } else if (action === 'mute') {
                  refs.current.onToggleMute();
                }
              } catch (evErr) {
                console.error('[GlobalShortcut Error] Errore elaborazione evento shortcut Tauri:', evErr);
              }
            });
          }
        }
      } catch (tauriErr) {
        console.error('[GlobalShortcut Error] Errore durante il setup delle scorciatoie globali Tauri:', tauriErr);
      }
    };

    initTauriGlobalShortcuts();

    return () => {
      if (unlistenTauriEvent) {
        try {
          unlistenTauriEvent();
        } catch (cleanErr) {
          console.error('[GlobalShortcut Error] Errore durante il cleanup delle scorciatoie Tauri:', cleanErr);
        }
      }
    };
  }, []);

  return null;
};
