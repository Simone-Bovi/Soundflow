import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Music, Volume2 } from 'lucide-react';
import { MaterialPalette } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';

const getAppWindow = () => {
  if (typeof window === 'undefined') return null;
  const winAny = window as any;
  if (winAny.__TAURI__?.window?.getCurrentWindow) {
    return winAny.__TAURI__.window.getCurrentWindow();
  }
  if (winAny.__TAURI__?.getCurrentWindow) {
    return winAny.__TAURI__.getCurrentWindow();
  }
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
};

interface TitlebarProps {
  palette?: MaterialPalette;
  currentTrackTitle?: string;
  isPlaying?: boolean;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  palette,
  currentTrackTitle,
  isPlaying = false,
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const initWindow = async () => {
      try {
        const appWindow = getAppWindow();
        if (appWindow) {
          const max = await appWindow.isMaximized();
          setIsMaximized(max);
          unlisten = await appWindow.onResized(async () => {
            try {
              const isMax = await appWindow.isMaximized();
              setIsMaximized(isMax);
            } catch {}
          });
        }
      } catch (err) {
        console.warn('[Titlebar] Not running in Tauri environment', err);
      }
    };
    initWindow();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const win = getAppWindow();
      if (win) {
        await win.minimize();
      } else {
        console.warn('[Titlebar] Window object unavailable');
      }
    } catch (error) {
      console.error('[Titlebar Error] Minimize failed:', error);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const win = getAppWindow();
      if (win) {
        await win.toggleMaximize();
        const max = await win.isMaximized();
        setIsMaximized(max);
      } else {
        setIsMaximized((prev) => !prev);
      }
    } catch (error) {
      console.error('[Titlebar Error] Toggle Maximize failed:', error);
      setIsMaximized((prev) => !prev);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const win = getAppWindow();
      if (win) {
        await win.close();
      } else {
        console.warn('[Titlebar] Window object unavailable');
      }
    } catch (error) {
      console.error('[Titlebar Error] Close failed:', error);
    }
  };

  const primaryColor = palette?.primary || '#a855f7';

  return (
    <header
      className="h-9 w-full text-slate-300 flex items-center justify-between select-none shrink-0 z-50 transition-colors duration-500 border-b border-white/5 cursor-default"
      style={{
        userSelect: 'none',
        backgroundColor: palette?.surface || '#020617',
      }}
    >
      {/* Drag Region Left: Logo & App Title */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="flex items-center gap-2 px-3 h-full cursor-default select-none overflow-hidden"
      >
        <div
          data-tauri-drag-region
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        >
          <Music className="w-2.5 h-2.5 text-white pointer-events-none" />
        </div>
        <span
          data-tauri-drag-region
          className="text-xs font-bold tracking-wider uppercase text-slate-200 select-none font-['Outfit'] pointer-events-none"
        >
          Soundflow
        </span>

        {/* Currently playing context track if active */}
        {currentTrackTitle && (
          <div
            data-tauri-drag-region
            className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-slate-400 max-w-[240px] truncate pointer-events-none"
          >
            {isPlaying && (
              <Volume2 className="w-3 h-3 shrink-0 animate-pulse text-emerald-400 pointer-events-none" />
            )}
            <span data-tauri-drag-region className="truncate pointer-events-none">
              {currentTrackTitle}
            </span>
          </div>
        )}
      </div>

      {/* Drag Region Center: Empty Space for Dragging */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="flex-1 h-full cursor-default select-none"
      />

      {/* Control Buttons Right: Minimize, Maximize/Restore, Close */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
        className="flex items-center h-full shrink-0 relative z-50 pointer-events-auto"
      >
        {/* Minimize Button */}
        <button
          type="button"
          onClick={handleMinimize}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
          className="h-full w-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors duration-150 focus:outline-none cursor-pointer relative z-50"
          title="Riduci a icona"
          aria-label="Riduci a icona"
        >
          <Minus className="w-3.5 h-3.5 pointer-events-none" />
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
          className="h-full w-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors duration-150 focus:outline-none cursor-pointer relative z-50"
          title={isMaximized ? 'Ripristina' : 'Ingrandisci'}
          aria-label="Ripristina o ingrandisci"
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5 rotate-180 pointer-events-none" />
          ) : (
            <Square className="w-3 h-3 pointer-events-none" />
          )}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
          className="h-full w-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 active:bg-red-700 transition-colors duration-150 focus:outline-none cursor-pointer relative z-50"
          title="Chiudi"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4 pointer-events-none" />
        </button>
      </div>
    </header>
  );
};
