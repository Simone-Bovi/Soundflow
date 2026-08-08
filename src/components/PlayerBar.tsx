import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, SpatialMode, Track } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Maximize2,
  Sliders,
  Radio,
  Disc,
  Heart,
  ListMusic,
} from 'lucide-react';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  spatialMode: SpatialMode;
  palette: MaterialPalette;
  queueCount?: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleFavorite: (id: string) => void;
  onOpenFullScreen: () => void;
  onOpenEqualizer: () => void;
  onToggleSpatialMode: () => void;
  onOpenUpNext?: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  isRepeat,
  spatialMode,
  palette,
  queueCount,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFavorite,
  onOpenFullScreen,
  onOpenEqualizer,
  onToggleSpatialMode,
  onOpenUpNext,
}) => {
  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-2.5 inset-x-0 mx-auto w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-7xl z-40 p-2 sm:p-3 lg:p-3.5 backdrop-blur-2xl rounded-[24px] sm:rounded-[32px] border border-white/10 transition-all duration-300 shadow-2xl overflow-hidden"
      style={{
        backgroundColor: palette?.surfaceContainer ? `${palette.surfaceContainer}f0` : 'rgba(15, 23, 42, 0.9)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        
        {/* Left: Track Info & Artwork */}
        <div className="flex items-center gap-2.5 min-w-0 w-1/3 sm:w-1/4 shrink-0">
          <div
            onClick={onOpenFullScreen}
            className="relative group cursor-pointer w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-xl bg-slate-950"
          >
            <AnimatePresence mode="sync">
              <motion.img
                key={`cover-${currentTrack.id}`}
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: isPlaying ? 1.05 : 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
            {isPlaying && (
              <div className="absolute bottom-0.5 right-0.5 p-0.5 bg-slate-950/80 rounded-full z-10">
                <Disc className="w-3 h-3 animate-spin-slow" style={{ color: palette.primary }} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              onClick={onOpenFullScreen}
              className="text-xs sm:text-sm font-extrabold text-white truncate cursor-pointer hover:underline font-['Outfit']"
            >
              {currentTrack.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">{currentTrack.artist}</p>
            
            {/* Hi-Fi Bitrate Badges */}
            <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
              <span
                className="px-1.5 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider text-indigo-300 border"
                style={{
                  backgroundColor: palette.primaryContainer,
                  color: palette.onPrimaryContainer,
                  borderColor: palette.outline,
                }}
              >
                {currentTrack.format}
              </span>
              <span className="text-[9px] text-slate-400 font-mono truncate">
                {currentTrack.bitrate}
              </span>
            </div>
          </div>

          {/* Favorite toggle */}
          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className="hidden lg:block p-1.5 text-slate-400 hover:text-rose-400 transition-transform active:scale-90 shrink-0"
            title="Aggiungi ai preferiti"
          >
            <Heart
              className={`w-4 h-4 ${
                currentTrack.isFavorite ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>
        </div>

        {/* Center: Controls & Progress Bar */}
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1 max-w-md">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={onToggleShuffle}
              className={`hidden sm:block p-1.5 sm:p-2 rounded-full transition-all ${
                isShuffle ? 'text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              style={{
                backgroundColor: isShuffle ? palette.primary : 'transparent',
                boxShadow: isShuffle ? `0 2px 10px -2px ${palette.glowColor}` : 'none',
              }}
              title="Riproduzione Casuale"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onSkipBack}
              className="p-1.5 text-slate-300 hover:text-white transition-transform active:scale-90"
              title="Brano Precedente"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Expressive Circular Play/Pause Button */}
            <button
              onClick={onPlayPause}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition-all duration-300 active:scale-90 hover:scale-105 shrink-0"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 0 16px -2px ${palette.glowColor}, 0 2px 8px ${palette.glowColor}`,
              }}
              title={isPlaying ? 'Pausa' : 'Riproduci'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
              )}
            </button>

            <button
              onClick={onSkipForward}
              className="p-1.5 text-slate-300 hover:text-white transition-transform active:scale-90"
              title="Brano Successivo"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={onToggleRepeat}
              className={`hidden sm:block p-1.5 sm:p-2 rounded-full transition-all ${
                isRepeat ? 'text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              style={{
                backgroundColor: isRepeat ? palette.primary : 'transparent',
                boxShadow: isRepeat ? `0 2px 10px -2px ${palette.glowColor}` : 'none',
              }}
              title="Ripeti Brano"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expressive Track Progress Seek Bar */}
          <div className="w-full flex items-center gap-2 px-1">
            <span className="text-[10px] font-mono text-slate-400 w-8 text-right font-medium shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 group flex items-center h-3 cursor-pointer min-w-[60px]">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full z-10 opacity-0 cursor-pointer"
              />
              {/* Custom Track background with smooth rounded corners and unclipped glow */}
              <div className="absolute inset-x-0 h-2 rounded-full bg-slate-800/90 border border-white/10 overflow-hidden pointer-events-none">
                <div
                  className="h-full rounded-full transition-[width] duration-100 linear"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                    backgroundColor: palette?.primary || '#1DB954',
                    boxShadow: `0 0 10px ${palette?.glowColor || 'rgba(29, 185, 84, 0.5)'}`,
                  }}
                />
              </div>
              {/* Scrubbing Thumb Indicator */}
              <div
                className="absolute w-3 h-3 rounded-full bg-white shadow-md border-2 pointer-events-none transition-transform group-hover:scale-125"
                style={{
                  left: `calc(${Math.min(100, Math.max(0, progressPercent))}% - 6px)`,
                  borderColor: palette?.primary || '#1DB954',
                  boxShadow: `0 0 8px ${palette?.glowColor || 'rgba(29, 185, 84, 0.6)'}`,
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 w-8 font-medium shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Spatial Mode, Equalizer & Volume Controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-1/4 shrink-0">
          
          {/* Spatial Mode Pill Toggle */}
          <button
            onClick={onToggleSpatialMode}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
            style={{
              backgroundColor: spatialMode === 'dolby_atmos' ? palette.primaryContainer : 'rgba(15, 23, 42, 0.9)',
              color: spatialMode === 'dolby_atmos' ? palette.onPrimaryContainer : '#cbd5e1',
              borderColor: spatialMode === 'dolby_atmos' ? palette.primary : 'rgba(255, 255, 255, 0.1)',
              boxShadow: spatialMode === 'dolby_atmos' ? `0 2px 12px -2px ${palette.glowColor}` : 'none',
            }}
            title="Cambia Modalità Spaziale Audio"
          >
            <Radio
              className="w-3 h-3 animate-pulse"
              style={{ color: palette.primary }}
            />
            <span className="uppercase text-[9px] tracking-wider">
              {spatialMode === 'dolby_atmos' ? 'Atmos' : spatialMode}
            </span>
          </button>

          {/* Up Next / Queue Overlay trigger */}
          {onOpenUpNext && (
            <button
              onClick={onOpenUpNext}
              className="relative p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 transition-transform hover:scale-105"
              title="Apri Coda di Riproduzione (Up Next)"
            >
              <ListMusic className="w-3.5 h-3.5" style={{ color: palette.primary }} />
              {queueCount && queueCount > 0 ? (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-extrabold font-mono flex items-center justify-center border border-slate-950"
                  style={{ backgroundColor: palette.primary, color: palette.onPrimary }}
                >
                  {queueCount > 9 ? '9+' : queueCount}
                </span>
              ) : null}
            </button>
          )}

          {/* EQ Modal trigger */}
          <button
            onClick={onOpenEqualizer}
            className="hidden sm:block p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 transition-colors"
            title="Apri Equalizzatore"
          >
            <Sliders className="w-3.5 h-3.5" style={{ color: palette.primary }} />
          </button>

          {/* Volume control pill */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-white/10">
            <button
              onClick={onToggleMute}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-14 cursor-pointer"
              style={{ accentColor: palette.primary }}
            />
          </div>

          {/* Full-Screen Player expand */}
          <button
            onClick={onOpenFullScreen}
            className="p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 transition-transform hover:scale-105 shrink-0"
            title="Schermo Intero Player Expressive"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
