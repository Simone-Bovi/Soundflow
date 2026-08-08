import React, { useState } from 'react';
import { MaterialPalette, Track } from '../types';
import {
  X,
  ListMusic,
  GripVertical,
  Play,
  Pause,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Disc,
  Music,
  Sparkles,
  Search,
  Check,
  Heart,
} from 'lucide-react';

interface UpNextOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  palette: MaterialPalette;
  allTracks: Track[];
  onPlayTrack: (track: Track) => void;
  onPlayPause: () => void;
  onReorderQueue: (newQueue: Track[]) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite?: (id: string) => void;
}

export const UpNextOverlay: React.FC<UpNextOverlayProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  queue,
  palette,
  allTracks,
  onPlayTrack,
  onPlayPause,
  onReorderQueue,
  onRemoveFromQueue,
  onClearQueue,
  onAddToQueue,
  onToggleFavorite,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...queue];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    onReorderQueue(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...queue];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onReorderQueue(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === queue.length - 1) return;
    const updated = [...queue];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onReorderQueue(updated);
  };

  const filteredAddTracks = allTracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.album.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300">
      <div
        className="relative w-full max-w-2xl bg-slate-900/95 border border-white/15 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[82vh]"
        style={{
          boxShadow: `0 12px 40px -10px ${palette.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`,
        }}
      >
        {/* Top Overlay Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl text-white shadow-lg flex items-center justify-center"
              style={{ backgroundColor: palette.primary }}
            >
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-['Outfit'] tracking-tight flex items-center gap-2">
                Coda di Riproduzione
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/10">
                  {queue.length} in coda
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Riordina con drag-and-drop o frecce direzionali
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 transition-all shadow-sm active:scale-95"
                title="Svuota l'intera coda"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Svuota Coda</span>
              </button>
            )}

            <button
              onClick={() => setShowAddDrawer(!showAddDrawer)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: palette.primary }}
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer to search & add tracks to queue */}
        {showAddDrawer && (
          <div className="p-4 bg-slate-950 border-b border-white/10 space-y-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Seleziona brano da aggiungere in coda
              </span>
              <button
                onClick={() => setShowAddDrawer(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Chiudi
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca brano, artista o album..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {filteredAddTracks.map((tr, idx) => (
                <div
                  key={`add-${tr?.id || 'tr'}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={tr.coverUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{tr.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{tr.artist}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onAddToQueue(tr);
                    }}
                    className="p-1.5 rounded-lg transition-all shrink-0 ml-2"
                    style={{
                      backgroundColor: palette.primaryContainer,
                      color: palette.onPrimaryContainer,
                    }}
                    title="Aggiungi alla coda"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Brano in Riproduzione */}
          {currentTrack && (
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                Ora In Riproduzione
              </span>
              <div
                className="flex items-center justify-between p-3.5 rounded-2xl border transition-all shadow-md bg-slate-950/80"
                style={{
                  borderColor: palette.primary,
                  boxShadow: `0 4px 18px -4px ${palette.glowColor}`,
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                    <img
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Disc className="w-5 h-5 text-white animate-spin-slow" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-extrabold text-white truncate font-['Outfit']">
                      {currentTrack.title}
                    </h4>
                    <p className="text-xs text-slate-300 truncate">{currentTrack.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider text-white border"
                        style={{
                          backgroundColor: palette.primaryContainer,
                          borderColor: palette.outline,
                        }}
                      >
                        {currentTrack.format}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentTrack.bitrate}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onPlayPause}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 ml-3 transition-transform active:scale-95"
                  style={{ backgroundColor: palette.primary }}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Section 2: In Coda (Up Next List with Drag & Drop) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                In Coda ({queue.length})
              </span>
              {queue.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[10px] text-slate-500 italic">
                    Trascina <GripVertical className="w-3 h-3 inline text-slate-400" /> per riordinare
                  </span>
                  <button
                    onClick={onClearQueue}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-white hover:bg-rose-600/80 transition-all bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 shadow-sm active:scale-95"
                    title="Reset rapido della coda"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Svuota Coda</span>
                  </button>
                </div>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-white/10 text-center space-y-2">
                <Music className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Nessun brano in coda</p>
                <p className="text-xs text-slate-500">
                  Aggiungi brani cliccando sul tasto "Aggiungi" in alto o sfogliando la libreria.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((track, index) => {
                  const isBeingDragged = draggedIndex === index;
                  const isTargeted = dragOverIndex === index;

                  return (
                    <div
                      key={`queue-${track?.id || 'tr'}-${index}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 bg-slate-950/60 hover:bg-slate-800/80 cursor-grab active:cursor-grabbing ${
                        isBeingDragged ? 'opacity-40 border-dashed border-emerald-500 scale-98' : 'border-white/10'
                      } ${
                        isTargeted && !isBeingDragged ? 'border-2 border-emerald-400 bg-emerald-950/30 shadow-lg' : ''
                      }`}
                    >
                      {/* Drop Target Indicator Line */}
                      {isTargeted && !isBeingDragged && (
                        <div
                          className="absolute -top-1 inset-x-2 h-1 rounded-full z-20 animate-pulse"
                          style={{ backgroundColor: palette.primary }}
                        />
                      )}

                      {/* Left: Drag Handle & Track Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Drag Handle */}
                        <div className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Order Index */}
                        <span className="text-xs font-mono font-bold text-slate-500 w-5 text-center shrink-0">
                          {index + 1}
                        </span>

                        {/* Track Cover */}
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                        />

                        {/* Metadata */}
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs sm:text-sm font-bold text-white truncate font-['Outfit']">
                            {track.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions (Move Up/Down, Play Now, Remove) */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Move Up / Move Down buttons */}
                        <div className="flex flex-col opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 hover:text-white text-slate-400 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                            title="Sposta Su"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === queue.length - 1}
                            className="p-1 hover:text-white text-slate-400 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                            title="Sposta Giù"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Format badge */}
                        <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-900 border border-white/10 text-slate-300 uppercase">
                          {track.format}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block w-10 text-right">
                          {formatTime(track.duration)}
                        </span>

                        {/* Quick Favorite Heart Button */}
                        {onToggleFavorite && (
                          <button
                            onClick={() => onToggleFavorite(track.id)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
                            title={track.isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                track.isFavorite
                                  ? 'fill-rose-500 text-rose-500'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            />
                          </button>
                        )}

                        {/* Play Now directly from queue */}
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                          title="Riproduci ora"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>

                        {/* Remove from queue */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Sei sicuro? Vuoi rimuovere "${track.title}" dalla coda?`)) {
                              onRemoveFromQueue(index);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Rimuovi dalla coda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>
            {queue.length > 0
              ? `Prossimo brano: ${queue[0].title} (${queue[0].artist})`
              : 'Nessun brano successivo programmato'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full font-bold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: palette.primary }}
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
};
