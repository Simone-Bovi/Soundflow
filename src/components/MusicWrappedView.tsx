import React, { useState, useEffect, useMemo } from 'react';
import { MaterialPalette, Track } from '../types';
import {
  getWrappedStats,
  WrappedTimeframe,
  seedDemoWrappedHistory,
  clearWrappedHistory,
} from '../lib/wrappedTracker';
import {
  Sparkles,
  Clock,
  Calendar,
  Infinity as InfinityIcon,
  Crown,
  Disc,
  Play,
  User,
  Music,
  BarChart2,
  Trash2,
  RefreshCw,
  Flame,
  Zap,
} from 'lucide-react';

interface MusicWrappedViewProps {
  palette: MaterialPalette;
  tracks: Track[];
}

export const MusicWrappedView: React.FC<MusicWrappedViewProps> = ({
  palette,
  tracks,
}) => {
  const [timeframe, setTimeframe] = useState<WrappedTimeframe>('year');
  const [updateNonce, setUpdateNonce] = useState(0);

  // Subscribe to play record events
  useEffect(() => {
    const handleRecorded = () => {
      setUpdateNonce((prev) => prev + 1);
    };
    window.addEventListener('sonora_play_recorded', handleRecorded);
    return () => {
      window.removeEventListener('sonora_play_recorded', handleRecorded);
    };
  }, []);

  const stats = useMemo(() => {
    return getWrappedStats(timeframe, tracks);
  }, [timeframe, tracks, updateNonce]);

  const handleSeedDemo = () => {
    seedDemoWrappedHistory(tracks);
  };

  const handleClear = () => {
    if (window.confirm('Sei sicuro di voler azzerare la tua cronologia di ascolto del Wrapped?')) {
      clearWrappedHistory();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Timeframe Selector Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl text-white shadow-lg animate-pulse"
            style={{
              backgroundColor: palette.primary,
              boxShadow: `0 0 20px -3px ${palette.glowColor}`,
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-white font-['Outfit']">
              Dati di Ascolto
            </h4>
            <p className="text-xs text-slate-400">
              Analisi approfondita dei tuoi gusti musicali salvata mese per mese e anno per anno
            </p>
          </div>
        </div>

        {/* Timeframe Segmented Control */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-white/10 shrink-0 shadow-inner w-full sm:w-auto justify-center">
          <button
            onClick={() => setTimeframe('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'month'
                ? 'bg-slate-800 text-white shadow-md border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={
              timeframe === 'month'
                ? { borderColor: `${palette.primary}60` }
                : undefined
            }
          >
            <Clock className="w-3.5 h-3.5" style={{ color: timeframe === 'month' ? palette.primary : undefined }} />
            <span>Ultimo Mese</span>
          </button>

          <button
            onClick={() => setTimeframe('year')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'year'
                ? 'bg-slate-800 text-white shadow-md border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={
              timeframe === 'year'
                ? { borderColor: `${palette.primary}60` }
                : undefined
            }
          >
            <Calendar className="w-3.5 h-3.5" style={{ color: timeframe === 'year' ? palette.primary : undefined }} />
            <span>Ultimo Anno</span>
          </button>

          <button
            onClick={() => setTimeframe('lifetime')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'lifetime'
                ? 'bg-slate-800 text-white shadow-md border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={
              timeframe === 'lifetime'
                ? { borderColor: `${palette.primary}60` }
                : undefined
            }
          >
            <InfinityIcon className="w-3.5 h-3.5" style={{ color: timeframe === 'lifetime' ? palette.primary : undefined }} />
            <span>Lifetime</span>
          </button>
        </div>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Total Time */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full blur-xl opacity-20 pointer-events-none" style={{ backgroundColor: palette.primary }} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tempo Ascolto</span>
            <Clock className="w-4 h-4 text-slate-400" style={{ color: palette.primary }} />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono leading-none">
              {stats.totalHours >= 1 ? `${stats.totalHours}h` : `${stats.totalMinutes} min`}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {stats.totalMinutes} minuti totali
            </p>
          </div>
        </div>

        {/* Total Plays */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Riproduzioni</span>
            <Play className="w-4 h-4 text-slate-400" style={{ color: palette.primary }} />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono leading-none">
              {stats.totalPlays}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">brani ascoltati</p>
          </div>
        </div>

        {/* Unique Songs */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Brani Unici</span>
            <Music className="w-4 h-4 text-slate-400" style={{ color: palette.primary }} />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono leading-none">
              {stats.uniqueSongsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">tracce diverse</p>
          </div>
        </div>

        {/* Unique Artists */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Artisti Unici</span>
            <User className="w-4 h-4 text-slate-400" style={{ color: palette.primary }} />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono leading-none">
              {stats.uniqueArtistsCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">artisti esplorati</p>
          </div>
        </div>

      </div>

      {/* Main Content: Top Canzoni & Top Artisti */}
      {stats.totalPlays === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-950/80 border border-white/10 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-slate-900 text-slate-400 border border-white/10">
            <Disc className="w-8 h-8 animate-spin-slow" style={{ color: palette.primary }} />
          </div>
          <div>
            <h5 className="text-base font-extrabold text-white">Nessun dato di ascolto per questo periodo</h5>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Inizia ad ascoltare i tuoi brani preferiti per generare il tuo Wrapped personalizzato, oppure genera dati demo di prova!
            </p>
          </div>
          <button
            onClick={handleSeedDemo}
            className="px-5 py-2.5 rounded-full text-xs font-extrabold text-white shadow-lg transition-transform active:scale-95 inline-flex items-center gap-2"
            style={{ backgroundColor: palette.primary }}
          >
            <Zap className="w-4 h-4" />
            Genera Dati di Ascolto Demo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top 5 Canzoni */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h5 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Top 5 Canzoni ({timeframe === 'month' ? 'Mese' : timeframe === 'year' ? 'Anno' : 'Totale'})
                </h5>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{stats.topSongs.length} brani</span>
            </div>

            <div className="space-y-2.5">
              {stats.topSongs.map((song, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={`top-song-${song.item.id || song.item.title}-${idx}`}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/30 shadow-lg'
                        : 'bg-slate-900/60 border-white/5 hover:bg-slate-900'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 font-mono">
                      {isFirst ? (
                        <Crown className="w-5 h-5 text-amber-400" />
                      ) : (
                        <span className="text-slate-400">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Album Art */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                      {song.item.coverUrl ? (
                        <img src={song.item.coverUrl} alt={song.item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <Music className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Song Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{song.item.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{song.item.artist}</div>
                    </div>

                    {/* Play count */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-extrabold text-white">
                        {song.playCount} {song.playCount === 1 ? 'ascolto' : 'ascolti'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {Math.round(song.totalDurationSeconds / 60)} min
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 Artisti */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4" style={{ color: palette.primary }} />
                <h5 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Top 5 Artisti ({timeframe === 'month' ? 'Mese' : timeframe === 'year' ? 'Anno' : 'Totale'})
                </h5>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{stats.topArtists.length} artisti</span>
            </div>

            <div className="space-y-2.5">
              {stats.topArtists.map((art, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={`top-artist-${art.item.name}-${idx}`}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isFirst
                        ? 'bg-slate-900 border-white/20 shadow-lg'
                        : 'bg-slate-900/60 border-white/5 hover:bg-slate-900'
                    }`}
                    style={
                      isFirst
                        ? { borderColor: `${palette.primary}50` }
                        : undefined
                    }
                  >
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 font-mono">
                      {isFirst ? (
                        <span className="p-1 rounded-lg text-white font-black" style={{ backgroundColor: palette.primary }}>
                          #1
                        </span>
                      ) : (
                        <span className="text-slate-400">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Artist Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                      {art.item.coverUrl ? (
                        <img src={art.item.coverUrl} alt={art.item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Artist Name & Progress bar */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{art.item.name}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-300 ml-2">
                          {art.percentage}% del totale
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(5, art.percentage)}%`,
                            backgroundColor: palette.primary,
                          }}
                        />
                      </div>
                    </div>

                    {/* Play count */}
                    <div className="text-right shrink-0 pl-1">
                      <div className="text-xs font-mono font-extrabold text-white">
                        {art.playCount} plays
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Top Genres Breakdown */}
      {stats.topGenres.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: palette.primary }} />
            <span className="text-xs font-bold text-white">Generi Musicali Più Ascoltati</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {stats.topGenres.map((g, idx) => (
              <div
                key={`top-genre-${g.genre}-${idx}`}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold flex items-center gap-2 text-white"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.primary }} />
                <span>{g.genre}</span>
                <span className="text-[10px] font-mono text-slate-400">({g.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistence Note */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
        <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
        <span>I tuoi dati di ascolto sono memorizzati localmente e aggiornati continuamente in tempo reale.</span>
      </div>

    </div>
  );
};
