import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, SpatialMode, Track, LyricLine } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { parseLrc, matchLrcToTrack } from '../lib/lrcParser';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Radio,
  Sliders,
  Volume2,
  Volume1,
  VolumeX,
  Minus,
  Plus,
  Music2,
  ListMusic,
  Maximize2,
  Minimize2,
  Disc,
  Upload,
  FileText,
} from 'lucide-react';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  spatialMode: SpatialMode;
  palette: MaterialPalette;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFavorite: (id: string) => void;
  onOpenEqualizer: () => void;
  onToggleSpatialMode: () => void;
  onUpdateTrackLyrics?: (trackId: string, lyrics: LyricLine[]) => void;
  onOpenUpNext?: () => void;
  playingContext?: string;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  spatialMode,
  palette,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onOpenEqualizer,
  onToggleSpatialMode,
  onUpdateTrackLyrics,
  onOpenUpNext,
  playingContext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);

  // Compute active lyric index based on current time
  const activeLyricIndex = useMemo(() => {
    if (!currentTrack?.lyrics || currentTrack.lyrics.length === 0) return -1;
    for (let i = 0; i < currentTrack.lyrics.length; i++) {
      const lineTime = currentTrack.lyrics[i].time;
      const nextLineTime = currentTrack.lyrics[i + 1]?.time;
      if (currentTime >= lineTime && (nextLineTime === undefined || currentTime < nextLineTime)) {
        return i;
      }
    }
    return -1;
  }, [currentTrack?.lyrics, currentTime]);

  // Auto-scroll lyrics container to center active line
  useEffect(() => {
    if (!isOpen) return;
    if (activeLyricIndex !== -1 && activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeEl = activeLyricRef.current;

      const containerHeight = container.clientHeight;
      const activeTop = activeEl.offsetTop;
      const activeHeight = activeEl.clientHeight;

      const targetScrollTop = activeTop - containerHeight / 2 + activeHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }
  }, [isOpen, activeLyricIndex]);

  // Audio Spectrum Frequency Bar Animation Loop with Dynamic Canvas Resizing
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvas.width = Math.floor(rect.width * (window.devicePixelRatio || 1));
          canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
        }
      }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const render = () => {
      animId = requestAnimationFrame(render);
      const freqData = audioEngine.getByteFrequencyData();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 48;
      const barWidth = Math.max(2, (canvas.width / barCount) - 4);

      for (let i = 0; i < barCount; i++) {
        const value = freqData[i] || 0;
        const percent = value / 255;
        const barHeight = Math.max(6, percent * canvas.height * 0.85);

        const x = i * (barWidth + 4);
        const y = canvas.height - barHeight;

        // Expressive Gradient from Primary to Secondary
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, palette.primary);
        gradient.addColorStop(1, palette.secondary);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isOpen, palette]);

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex flex-col justify-between p-6 md:p-10 transition-all duration-500">
      
      {/* Background Expressive Material You Aura */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 blur-3xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${palette.primary} 0%, ${palette.secondaryContainer} 50%, transparent 80%)`,
        }}
      />

      {/* Top Bar: Navigation & Track Status */}
      <div className="relative z-10 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button
          onClick={onClose}
          className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-90 flex items-center gap-2 group shadow-md"
          title="Chiudi Schermo Intero"
        >
          <Minimize2 className="w-5 h-5 transition-colors" style={{ color: palette.primary }} />
          <span className="text-xs font-bold hidden sm:inline text-slate-300 group-hover:text-white">Riduci</span>
        </button>

        <div className="text-center">
          <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">
            Riproduzione Hi-Fi
          </span>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span
              className="px-2.5 py-0.5 text-xs font-bold rounded-full border"
              style={{
                backgroundColor: palette.primaryContainer,
                color: palette.onPrimaryContainer,
                borderColor: palette.outline,
              }}
            >
              {currentTrack.format}
            </span>
            <span className="text-xs font-mono text-slate-300">
              {currentTrack.bitrate}
            </span>
          </div>
        </div>

        <div className="w-20" /> {/* Spacer balance for centered header */}
      </div>

      {/* Center Content Section: Side-by-Side 3-Column Layout (Spettro a sinistra, Album al centro, Testo a destra) */}
      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto py-2 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Panel 1 (Left): Spectrum Canvas Visualizer (col-span-1 sm:col-span-6 lg:col-span-4) */}
        <div className="lg:col-span-4 h-64 sm:h-72 flex flex-col justify-between bg-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Spettro Audio Real-Time</span>
            <span className="font-mono px-2 py-0.5 rounded-full bg-slate-950 text-xs font-bold border border-white/10" style={{ color: palette.primary }}>
              {currentTrack.channels}
            </span>
          </div>

          {/* Realtime Canvas Spectrum */}
          <div className="my-auto w-full h-32 flex items-center justify-center relative overflow-hidden rounded-2xl bg-slate-950/50 border border-white/5 p-2">
            <canvas
              ref={canvasRef}
              width={400}
              height={130}
              className="w-full h-full rounded-2xl"
            />
          </div>

          {/* Spatial Mode Status */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-white/10 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-3.5 h-3.5 shrink-0" style={{ color: palette.primary }} />
              <span className="text-slate-300 truncate">Audio 3D:</span>
              <span className="font-bold text-white uppercase truncate">{spatialMode}</span>
            </div>
            <button
              onClick={onToggleSpatialMode}
              className="hover:underline font-bold shrink-0 ml-2 text-xs"
              style={{ color: palette.primary }}
            >
              Cambia
            </button>
          </div>
        </div>

        {/* Panel 2 (Center): Album Art & Track Info (col-span-1 lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-2">
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 rounded-3xl overflow-hidden shadow-2xl group border border-white/10 bg-slate-950">
            <AnimatePresence mode="sync">
              <motion.img
                key={`fullscreen-cover-${currentTrack.id}`}
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                initial={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: isPlaying ? 1.04 : 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            </AnimatePresence>
            {isPlaying && (
              <div className="absolute top-2.5 right-2.5 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 shadow-lg z-10">
                <Disc className="w-4 h-4 animate-spin-slow" style={{ color: palette.primary }} />
              </div>
            )}
          </div>

          {/* Title & Artist info */}
          <div className="mt-3 text-center max-w-xs flex flex-col items-center">
            <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-white tracking-tight font-['Outfit'] truncate w-full">
              {currentTrack.title}
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5 truncate w-full">
              {currentTrack.artist} — <span className="text-slate-400">{currentTrack.album}</span>
            </p>

            {playingContext && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 text-[11px] font-semibold text-slate-300 shadow-md max-w-full">
                <ListMusic className="w-3.5 h-3.5 shrink-0" style={{ color: palette.primary }} />
                <span className="truncate">
                  <strong className="text-white font-bold">{playingContext}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Panel 3 (Right): Synced Text / Lyrics (col-span-1 sm:col-span-6 lg:col-span-4) */}
        <div className="lg:col-span-4 h-64 sm:h-72 flex flex-col bg-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-xl overflow-hidden relative">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" style={{ color: palette.primary }} />
              <span>Testo Sincronizzato</span>
            </h4>

            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 hover:text-white cursor-pointer border border-white/10 transition-colors shadow-sm">
              <Upload className="w-3 h-3" style={{ color: palette.primary }} />
              <span>Carica .LRC (Singoli / Multipli)</span>
              <input
                type="file"
                multiple
                accept=".lrc,.txt"
                onChange={async (e) => {
                  if (!e.target.files || e.target.files.length === 0 || !onUpdateTrackLyrics) return;
                  const files = Array.from(e.target.files) as File[];

                  if (files.length === 1 && currentTrack) {
                    const file = files[0];
                    try {
                      const text = await file.text();
                      const matched = matchLrcToTrack(text, file.name, [currentTrack]);
                      if (matched) {
                        onUpdateTrackLyrics(matched.track.id, matched.parsed.lyrics);
                      } else {
                        const parsed = parseLrc(text);
                        if (parsed.length) {
                          onUpdateTrackLyrics(currentTrack.id, parsed);
                        }
                      }
                    } catch (err) {
                      console.error('LRC read error:', err);
                    }
                  } else if (files.length > 1 && currentTrack) {
                    for (const file of files) {
                      try {
                        const text = await file.text();
                        const matched = matchLrcToTrack(text, file.name, [currentTrack]);
                        if (matched) {
                          onUpdateTrackLyrics(matched.track.id, matched.parsed.lyrics);
                        }
                      } catch (err) {
                        console.error('LRC batch read error:', err);
                      }
                    }
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>

          <div
            ref={lyricsContainerRef}
            className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 py-20 relative"
          >
            {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (
              currentTrack.lyrics.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                return (
                  <p
                    key={`lyric-${idx}-${line.time}`}
                    ref={isActive ? activeLyricRef : null}
                    onClick={() => onSeek(line.time)}
                    className={`cursor-pointer transition-all duration-300 text-xs sm:text-sm ${
                      isActive
                        ? 'font-extrabold text-sm sm:text-base scale-105 pl-3 border-l-2 py-1 opacity-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 opacity-50 hover:opacity-100 py-0.5'
                    }`}
                    style={{
                      color: isActive ? palette.primary : undefined,
                      borderColor: isActive ? palette.primary : undefined,
                    }}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2.5 p-4">
                <FileText className="w-8 h-8" style={{ color: palette.primary, opacity: 0.6 }} />
                <p className="text-slate-400 text-xs max-w-xs">
                  Nessun testo sincronizzato caricato. Carica un file .LRC per leggere il testo in tempo reale!
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Expressive Playback & Progress Controls */}
      <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col gap-4">
        
        {/* Track Seek Progress Bar */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-slate-300 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 group flex items-center h-6 cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full z-10 opacity-0 cursor-pointer"
            />
            <div className="absolute inset-x-0 h-2.5 rounded-full bg-slate-800/90 border border-white/10 overflow-hidden pointer-events-none">
              <div
                className="h-full rounded-full transition-[width] duration-100 linear"
                style={{
                  width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  backgroundColor: palette?.primary || '#1DB954',
                  boxShadow: `0 0 12px ${palette?.glowColor || 'rgba(29, 185, 84, 0.5)'}`,
                }}
              />
            </div>
            {/* Scrubbing Thumb Indicator */}
            <div
              className="absolute w-4 h-4 rounded-full bg-white shadow-md border-2 pointer-events-none transition-transform group-hover:scale-125"
              style={{
                left: `calc(${Math.min(100, Math.max(0, progressPercent))}% - 8px)`,
                borderColor: palette?.primary || '#1DB954',
                boxShadow: `0 0 12px ${palette?.glowColor || 'rgba(29, 185, 84, 0.6)'}`,
              }}
            />
          </div>
          <span className="text-xs font-mono text-slate-300 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Controls Row */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg max-w-md mx-auto w-full">
          <button
            onClick={onToggleMute}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Riattiva Audio' : 'Disattiva Audio'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-rose-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-5 h-5 text-slate-300" style={{ color: palette.primary }} />
            ) : (
              <Volume2 className="w-5 h-5 text-slate-300" style={{ color: palette.primary }} />
            )}
          </button>

          <button
            onClick={() => onVolumeChange(Math.max(0, volume - 0.05))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
            title="Diminuisci Volume (-5%)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="relative flex-1 group flex items-center h-4 cursor-pointer">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-full z-10 opacity-0 cursor-pointer"
            />
            <div className="absolute inset-x-0 h-2 rounded-full bg-slate-800 border border-white/10 overflow-hidden pointer-events-none">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${(isMuted ? 0 : volume) * 100}%`,
                  backgroundColor: palette.primary,
                }}
              />
            </div>
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 pointer-events-none transition-transform group-hover:scale-125"
              style={{
                left: `calc(${(isMuted ? 0 : volume) * 100}% - 7px)`,
                borderColor: palette.primary,
              }}
            />
          </div>

          <button
            onClick={() => onVolumeChange(Math.min(1, volume + 0.05))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
            title="Aumenta Volume (+5%)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono font-bold text-slate-300 w-9 text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-rose-400"
          >
            <Heart
              className={`w-6 h-6 ${
                currentTrack.isFavorite ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={onSkipBack}
              className="p-3 text-slate-300 hover:text-white transition-transform active:scale-90"
            >
              <SkipBack className="w-7 h-7" />
            </button>

            <button
              onClick={onPlayPause}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-90 hover:scale-105 shrink-0"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 0 32px -2px ${palette.glowColor}, 0 6px 18px ${palette.glowColor}`,
              }}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-white" />
              ) : (
                <Play className="w-8 h-8 fill-white ml-1" />
              )}
            </button>

            <button
              onClick={onSkipForward}
              className="p-3 text-slate-300 hover:text-white transition-transform active:scale-90"
            >
              <SkipForward className="w-7 h-7" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenUpNext && (
              <button
                onClick={onOpenUpNext}
                className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-transform active:scale-95"
                title="Coda di Riproduzione (Up Next)"
              >
                <ListMusic className="w-6 h-6" style={{ color: palette.primary }} />
              </button>
            )}

            <button
              onClick={onOpenEqualizer}
              className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white"
            >
              <Sliders className="w-6 h-6" style={{ color: palette.primary }} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
