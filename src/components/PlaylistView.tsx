import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, Playlist, Track } from '../types';
import {
  Sparkles,
  Plus,
  Play,
  Trash2,
  ListMusic,
  Music,
  Heart,
  Radio,
  Check,
  X,
  Shuffle,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Upload,
  Crop,
} from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';
import { saveMediaCoverToDB } from '../lib/indexedDb';

interface PlaylistViewProps {
  playlists: Playlist[];
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  palette: MaterialPalette;
  selectedPlaylistId?: string;
  onSelectPlaylist?: (id: string) => void;
  onCreatePlaylist: (name: string, description: string, colorTag: string) => void;
  onDeletePlaylist: (id: string) => void;
  onUpdatePlaylist?: (playlistId: string, updates: Partial<Playlist>) => void;
  onRemoveTrackFromPlaylist: (trackId: string, playlistId: string) => void;
  onPlayTrack: (track: Track) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onToggleFavorite?: (id: string) => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
];

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlists,
  tracks,
  currentTrack,
  isPlaying,
  palette,
  selectedPlaylistId: propSelectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylist,
  onRemoveTrackFromPlaylist,
  onPlayTrack,
  onPlayPlaylist,
  onToggleFavorite,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    propSelectedPlaylistId || playlists[0]?.id || ''
  );

  React.useEffect(() => {
    if (propSelectedPlaylistId) {
      setSelectedPlaylistId(propSelectedPlaylistId);
    }
  }, [propSelectedPlaylistId]);

  const [deletingPlaylistIds, setDeletingPlaylistIds] = useState<Set<string>>(new Set());

  const handleDeletePlaylistWithAnimation = (plId: string, plName: string) => {
    if (window.confirm(`Sei sicuro? Vuoi davvero eliminare la playlist "${plName}"?`)) {
      setDeletingPlaylistIds((prev) => new Set(prev).add(plId));
      setTimeout(() => {
        onDeletePlaylist(plId);
        setDeletingPlaylistIds((prev) => {
          const next = new Set(prev);
          next.delete(plId);
          return next;
        });
      }, 350);
    }
  };
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistColor, setNewPlaylistColor] = useState('#1DB954');

  // Cover edit modal state
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editOriginalCoverUrl, setEditOriginalCoverUrl] = useState('');
  const [editCropParams, setEditCropParams] = useState({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('#1DB954');
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  const getPlaylistTrackCount = (pl: Playlist) => {
    if (pl.isSmart) {
      if (pl.smartType === 'favorites') return tracks.filter((t) => t.isFavorite).length;
      if (pl.smartType === 'flac') return tracks.filter((t) => t.format === 'FLAC').length;
      if (pl.smartType === 'atmos') return tracks.filter((t) => t.format === 'Dolby Atmos').length;
      if (pl.smartType === 'recent') return tracks.length;
      return 0;
    }
    return pl.trackIds.length;
  };

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];

  // Resolve tracks for selected playlist (handling smart playlists)
  const rawPlaylistTracks = tracks.filter((track) => {
    if (!selectedPlaylist) return false;
    if (selectedPlaylist.isSmart) {
      if (selectedPlaylist.smartType === 'favorites') return track.isFavorite;
      if (selectedPlaylist.smartType === 'flac') return track.format === 'FLAC';
      if (selectedPlaylist.smartType === 'atmos') return track.format === 'Dolby Atmos';
      if (selectedPlaylist.smartType === 'recent') return true;
    }
    return selectedPlaylist.trackIds.includes(track.id);
  });

  const playlistTracks = Array.from(
    new Map<string, Track>(rawPlaylistTracks.map((t) => [t.id, t])).values()
  );

  const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);
  const formatTotalTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    return `${mins} min`;
  };

  const formatTrackTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), newPlaylistColor);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsCreating(false);
  };

  const openEditCoverModal = () => {
    if (!selectedPlaylist) return;
    setEditName(selectedPlaylist.name);
    setEditDesc(selectedPlaylist.description || '');
    setEditCoverUrl(selectedPlaylist.coverUrl || PRESET_COVERS[0]);
    setEditOriginalCoverUrl(selectedPlaylist.originalCoverUrl || selectedPlaylist.coverUrl || PRESET_COVERS[0]);
    setEditCropParams(selectedPlaylist.cropParams || { zoom: 1, offsetX: 0, offsetY: 0 });
    setEditColor(selectedPlaylist.colorTag || palette.primary);
    setIsEditingCover(true);
  };

  const handleSaveCoverEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylist || !onUpdatePlaylist) return;
    onUpdatePlaylist(selectedPlaylist.id, {
      name: editName.trim() || selectedPlaylist.name,
      description: editDesc.trim(),
      coverUrl: editCoverUrl,
      originalCoverUrl: editOriginalCoverUrl,
      cropParams: editCropParams,
      colorTag: editColor,
    });
    setIsEditingCover(false);
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const dataUrl = evt.target.result as string;
          setCropImageSrc(dataUrl);
          setEditOriginalCoverUrl(dataUrl);
          setIsCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleOpenCropper = () => {
    const fullPhoto = editOriginalCoverUrl || editCoverUrl;
    if (fullPhoto) {
      setCropImageSrc(fullPhoto);
      setIsCropperOpen(true);
    }
  };

  const colorOptions = ['#1DB954', '#a855f7', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="flex-1 p-4 lg:p-8 flex flex-col md:flex-row gap-6">
      
      {/* Left Sidebar: Playlists List & Creator */}
      <div className="w-full md:w-80 shrink-0 bg-slate-900/60 p-5 rounded-3xl border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: palette.primary }} />
            <h3 className="text-lg font-bold text-white font-['Outfit']">Le Tue Playlist</h3>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="p-2 rounded-xl text-white shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: palette.primary }}
            title="Crea Nuova Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create Playlist Modal / Form */}
        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Nuova Playlist
            </h4>
            <input
              type="text"
              placeholder="Nome della playlist..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
            <input
              type="text"
              placeholder="Descrizione (opzionale)..."
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            {/* Color Tag Selection */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1.5">Colore Tag</span>
              <div className="flex items-center gap-2">
                {colorOptions.map((c, idx) => (
                  <button
                    type="button"
                    key={`new-pl-color-${c}-${idx}`}
                    onClick={() => setNewPlaylistColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newPlaylistColor === c ? 'scale-125 ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-xl text-white shadow-md"
                style={{ backgroundColor: palette.primary }}
              >
                Salva
              </button>
            </div>
          </form>
        )}

        {/* Playlist List Cards */}
        <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
          {Array.from(new Map<string, Playlist>(playlists.map((p) => [p.id, p])).values())
            .map((playlist, idx) => {
            const isSelected = selectedPlaylist?.id === playlist.id;
            const isDeleting = deletingPlaylistIds.has(playlist.id);
            return (
              <div
                key={`pl-card-${playlist.id}-${idx}`}
                onClick={() => !isDeleting && setSelectedPlaylistId(playlist.id)}
                className={`p-3 rounded-2xl transition-all flex items-center justify-between border relative overflow-hidden ${
                  isDeleting
                    ? 'bg-rose-950/50 text-rose-300 border-rose-500/80 scale-95 opacity-40 blur-[0.5px] pointer-events-none'
                    : isSelected
                    ? 'bg-slate-800/90 text-white border-white/20 shadow-lg cursor-pointer'
                    : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800/50 border-white/5 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white shrink-0 shadow-md relative"
                    style={{ backgroundColor: (playlist.isSmart || !playlist.colorTag) ? palette.primary : playlist.colorTag }}
                  >
                    {playlist.coverUrl ? (
                      <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-5 h-5" />
                    )}
                    {isDeleting && (
                      <div className="absolute inset-0 bg-rose-950/90 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-rose-400 animate-bounce" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold truncate">{playlist.name}</h4>
                      {playlist.isSmart && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10"
                          style={{
                            backgroundColor: palette.primaryContainer,
                            color: palette.onPrimaryContainer,
                          }}
                        >
                          Smart
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {isDeleting ? (
                        <span className="text-rose-400 font-semibold animate-pulse">Eliminazione...</span>
                      ) : (
                        `${getPlaylistTrackCount(playlist)} brani`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isDeleting && !playlist.isSmart && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylistWithAnimation(playlist.id, playlist.name);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Elimina Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Playlist Details & Tracks */}
      {selectedPlaylist ? (
        <div className="flex-1 bg-slate-900/60 p-6 lg:p-8 rounded-3xl border border-white/10 flex flex-col justify-between">
          
          {/* Header info */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                
                {/* Playlist Cover Art display with click edit trigger */}
                <div
                  onClick={openEditCoverModal}
                  className="relative group cursor-pointer w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-2xl"
                  style={{ backgroundColor: (selectedPlaylist.isSmart || !selectedPlaylist.colorTag) ? palette.primary : selectedPlaylist.colorTag }}
                  title="Clicca per cambiare l'immagine della copertina"
                >
                  {selectedPlaylist.coverUrl ? (
                    <img
                      src={selectedPlaylist.coverUrl}
                      alt={selectedPlaylist.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListMusic className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Modifica
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Playlist
                    </span>
                    <span
                      className="px-2.5 py-0.5 text-[10px] font-bold rounded-full text-white shadow-sm"
                      style={{ backgroundColor: (selectedPlaylist.isSmart || !selectedPlaylist.colorTag) ? palette.primary : selectedPlaylist.colorTag }}
                    >
                      {selectedPlaylist.name}
                    </span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-white font-['Outfit'] mt-0.5">
                    {selectedPlaylist.name}
                  </h2>
                  <div className="mt-1 space-y-0.5">
                    {(() => {
                      const desc = (selectedPlaylist.description || '')
                        .replace(/Album importato dalla cartella ".*?"/gi, '')
                        .replace(/Album importato dalla cartella/gi, '')
                        .replace(/\s*\(\d+\s*brani\)/i, '')
                        .trim();
                      return desc ? (
                        <p className="text-xs text-slate-300">{desc}</p>
                      ) : null;
                    })()}
                    <p className="text-xs text-slate-400 font-medium">
                      {playlistTracks.length} Brani ({formatTotalTime(totalDuration)})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openEditCoverModal}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 hover:text-white border border-white/10 transition-colors"
                  title="Modifica Copertina"
                >
                  <Edit3 className="w-4 h-4" />
                  Copertina
                </button>

                <button
                  onClick={() => onPlayPlaylist(selectedPlaylist)}
                  disabled={playlistTracks.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: palette.primary,
                    boxShadow: playlistTracks.length > 0 ? `0 4px 18px -3px ${palette.glowColor}` : 'none',
                  }}
                >
                  <Play className="w-4 h-4 fill-white" />
                  Riproduci
                </button>

                {!selectedPlaylist.isSmart && (
                  <button
                    onClick={() => handleDeletePlaylistWithAnimation(selectedPlaylist.id, selectedPlaylist.name)}
                    disabled={deletingPlaylistIds.has(selectedPlaylist.id)}
                    className="p-2.5 rounded-2xl bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
                    title="Elimina Playlist"
                  >
                    <Trash2 className={`w-4 h-4 ${deletingPlaylistIds.has(selectedPlaylist.id) ? 'text-rose-400 animate-bounce' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Tracks List */}
            <div className="mt-6 space-y-2">
              {playlistTracks.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-950/40 border border-white/5 space-y-3">
                  <Music className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">Nessun brano in questa playlist</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Aggiungi brani alla tua playlist dalla vista Libreria o importando i tuoi file audio.
                  </p>
                </div>
              ) : (
                playlistTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={`pl-track-${selectedPlaylist?.id || 'pl'}-${track.id}-${idx}`}
                      className={`flex items-center justify-between p-3 px-4 rounded-2xl border transition-all ${
                        isCurrent ? 'bg-slate-800/90 border-white/20 text-white shadow-md' : 'bg-slate-950/40 border-white/5 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-slate-500 w-5 text-center">
                          {idx + 1}
                        </span>

                        <div
                          onClick={() => onPlayTrack(track)}
                          className="w-10 h-10 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                        >
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4
                            onClick={() => onPlayTrack(track)}
                            className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:underline"
                          >
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400 shrink-0">
                        <span className="text-xs text-slate-400">
                          {formatTrackTime(track.duration)}
                        </span>
                        <span className="hidden sm:inline px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10 text-[10px] font-bold">
                          {track.format}
                        </span>
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
                        {!selectedPlaylist.isSmart && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Sei sicuro? Rimuovere "${track.title}" da questa playlist?`)) {
                                onRemoveTrackFromPlaylist(track.id, selectedPlaylist.id);
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            title="Rimuovi da questa playlist"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      ) : null}

      {/* Modifica Copertina Modal */}
      {isEditingCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] p-6 lg:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-extrabold text-white font-['Outfit'] flex items-center gap-2">
                <ImageIcon className="w-5 h-5" style={{ color: palette.primary }} />
                Modifica Copertina Playlist
              </h3>
              <button
                onClick={() => setIsEditingCover(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoverEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Immagine della Copertina
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-white/20 shadow-xl"
                    style={{ backgroundColor: editColor }}
                  >
                    <img
                      src={editCoverUrl}
                      alt="Anteprima"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_COVERS[0];
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="text-[11px] text-slate-400 block">Scegli un'immagine predefinita:</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {PRESET_COVERS.map((imgUrl, i) => (
                        <button
                          key={`preset-cover-option-${i}`}
                          type="button"
                          onClick={() => setEditCoverUrl(imgUrl)}
                          className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 transition-transform ${
                            editCoverUrl === imgUrl ? 'scale-110 border-emerald-400' : 'border-transparent'
                          }`}
                        >
                          <img src={imgUrl} alt="preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Incolla URL immagine..."
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:text-white cursor-pointer border border-white/10 transition-colors">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      Carica da Dispositivo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocalImageUpload}
                        className="hidden"
                      />
                    </label>

                    {editCoverUrl && (
                      <button
                        type="button"
                        onClick={handleOpenCropper}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:text-white border border-white/10 transition-colors"
                        title="Sposta, ingrandisci e centra l'immagine"
                      >
                        <Crop className="w-4 h-4 text-emerald-400" />
                        Regola & Centra Copertina
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Nome Playlist</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Descrizione</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Colore Tag Accent</label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((c, idx) => (
                    <button
                      type="button"
                      key={`edit-pl-color-${c}-${idx}`}
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editColor === c ? 'scale-125 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingCover(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white shadow-lg transition-transform active:scale-95"
                  style={{ backgroundColor: palette.primary }}
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageCropModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={cropImageSrc}
        title="Regola & Centra Copertina Album"
        initialShape="square"
        palette={palette}
        initialZoom={editCropParams.zoom}
        initialOffsetX={editCropParams.offsetX}
        initialOffsetY={editCropParams.offsetY}
        onConfirm={(croppedUrl, rawImageSrc, params) => {
          setEditCoverUrl(croppedUrl);
          setEditOriginalCoverUrl(rawImageSrc);
          setEditCropParams(params);
          setIsCropperOpen(false);
          if (selectedPlaylist) {
            saveMediaCoverToDB({
              id: `playlist-${selectedPlaylist.id}`,
              name: `Copertina: ${editName || selectedPlaylist.name}`,
              type: 'album',
              dataUrl: croppedUrl,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        }}
      />

    </div>
  );
};

