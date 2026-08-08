import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtistProfile, MaterialPalette, Playlist, Track } from '../types';
import {
  Play,
  Pause,
  Heart,
  Plus,
  Sliders,
  MoreVertical,
  Grid,
  List,
  Sparkles,
  Upload,
  Music,
  Trash2,
  Check,
  ListMusic,
  ChevronRight,
  Clock,
  User,
  Shuffle,
  Disc3,
  Filter,
} from 'lucide-react';
import { ArtistModal } from './ArtistModal';
import { getPrimaryArtist } from '../lib/metadataParser';

interface LibraryViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  playlists: Playlist[];
  recentlyPlayed?: Track[];
  artistProfiles?: ArtistProfile[];
  searchQuery: string;
  palette: MaterialPalette;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (id: string) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onDeleteTrack: (id: string) => void;
  onOpenImportModal: () => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onPlayPlaylist?: (playlist: Playlist) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onUpdateArtist?: (originalName: string, updated: { name: string; coverUrl: string; bio?: string }) => void;
  onDeleteArtist?: (artistName: string, trackIds?: string[]) => void;
  onSelectArtist?: (artistName: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  playlists,
  recentlyPlayed = [],
  artistProfiles = [],
  searchQuery,
  palette,
  onPlayTrack,
  onToggleFavorite,
  onAddTrackToPlaylist,
  onDeleteTrack,
  onOpenImportModal,
  onSelectPlaylist,
  onPlayPlaylist,
  onDeletePlaylist,
  onUpdateArtist,
  onDeleteArtist,
  onSelectArtist,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tutti');
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [selectedArtistModalName, setSelectedArtistModalName] = useState<string | null>(null);
  const [deletingPlaylistIds, setDeletingPlaylistIds] = useState<Set<string>>(new Set());

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  // Compute unique genres from tracks
  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    tracks.forEach((t) => {
      if (t.genre && t.genre.trim()) {
        genresSet.add(t.genre.trim());
      }
    });
    return ['Tutti', 'Preferiti', ...Array.from(genresSet)];
  }, [tracks]);

  // Compute primary artists list for home page featured artists
  const artistsList = useMemo(() => {
    const map = new Map<string, { originalName: string; name: string; tracks: Track[]; coverUrl: string; profile?: ArtistProfile }>();
    tracks.forEach((track) => {
      const primaryName = getPrimaryArtist(track.artist || 'Artista Sconosciuto');
      const key = primaryName.toLowerCase();

      const profile = artistProfiles.find(
        (ap) =>
          (ap.originalName && ap.originalName.toLowerCase() === key) ||
          (ap.name && ap.name.toLowerCase() === key) ||
          (ap.id && ap.id === key)
      );

      if (!map.has(key)) {
        map.set(key, {
          originalName: primaryName,
          name: profile?.name || primaryName,
          tracks: [],
          coverUrl: profile?.coverUrl || track.coverUrl,
          profile,
        });
      }
      map.get(key)!.tracks.push(track);
    });

    return Array.from(map.values()).map((art) => ({
      ...art,
      albumsCount: new Set(art.tracks.map((t) => t.album || 'Album')).size,
    }));
  }, [tracks, artistProfiles]);

  const handleDeletePlaylistWithAnimation = (plId: string, plName: string) => {
    if (window.confirm(`Sei sicuro? Vuoi davvero eliminare la playlist "${plName}"?`)) {
      setDeletingPlaylistIds((prev) => new Set(prev).add(plId));
      setTimeout(() => {
        if (onDeletePlaylist) {
          onDeletePlaylist(plId);
        }
        setDeletingPlaylistIds((prev) => {
          const next = new Set(prev);
          next.delete(plId);
          return next;
        });
      }, 350);
    }
  };

  // Filter & Search Logic
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const matchesSearch =
        searchQuery === '' ||
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGenre =
        selectedGenre === 'Tutti' ||
        (selectedGenre === 'Preferiti' && track.isFavorite) ||
        track.genre.toLowerCase() === selectedGenre.toLowerCase();

      return matchesSearch && matchesGenre;
    });
  }, [tracks, searchQuery, selectedGenre]);

  // Deduplicate tracks by id to prevent key collision warnings
  const displayTracks = useMemo(() => {
    return Array.from(new Map<string, Track>(filteredTracks.map((t) => [t.id, t])).values());
  }, [filteredTracks]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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

  const handleShufflePlayAll = () => {
    if (tracks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    onPlayTrack(tracks[randomIndex]);
  };

  const handlePlayFavorites = () => {
    const favs = tracks.filter((t) => t.isFavorite);
    if (favs.length > 0) {
      onPlayTrack(favs[0]);
    } else if (tracks.length > 0) {
      onPlayTrack(tracks[0]);
    }
  };

  const hiResCount = useMemo(() => {
    return tracks.filter((t) => t.format === 'FLAC' || t.format === 'Dolby Atmos').length;
  }, [tracks]);

  return (
    <div className="flex-1 p-3 sm:p-6 lg:p-8 space-y-8">
      
      {/* Welcome Hero Dashboard Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: palette.primary }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5" style={{ color: palette.primary }} />
              <span>{greeting}, bentornato su Soundflow</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] tracking-tight">
              La Tua Libreria Musicale
            </h2>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-200 border border-white/10 font-medium">
                <strong className="text-white font-bold">{tracks.length}</strong> Brani
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-200 border border-white/10 font-medium">
                <strong className="text-white font-bold">{playlists.length}</strong> Playlist
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-200 border border-white/10 font-medium">
                <strong className="text-white font-bold">{artistsList.length}</strong> Artisti
              </span>
              {hiResCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                  <Disc3 className="w-3.5 h-3.5 text-emerald-400" />
                  <strong className="text-emerald-200 font-bold">{hiResCount}</strong> Hi-Res Audio
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleShufflePlayAll}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-xl transition-all active:scale-95 hover:brightness-110"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 4px 16px -2px ${palette.glowColor}`,
              }}
            >
              <Shuffle className="w-4 h-4" />
              <span>Riproduzione Casuale</span>
            </button>

            <button
              onClick={handlePlayFavorites}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 shadow-lg transition-all active:scale-95"
            >
              <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
              <span>Preferiti</span>
            </button>

            <button
              onClick={onOpenImportModal}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs text-slate-200 bg-slate-900/80 hover:bg-slate-800/80 border border-white/10 shadow-lg transition-all active:scale-95"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Importa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Artisti in Evidenza Section */}
      {artistsList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl text-white shadow-md"
                style={{ backgroundColor: palette.primary }}
              >
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-extrabold text-white font-['Outfit'] tracking-tight">
                Artisti In Evidenza
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/10">
                {artistsList.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
            {artistsList.map((artist, idx) => {
              const isArtistPlaying =
                artist.tracks.some((t) => t.id === currentTrack?.id) && isPlaying;

              return (
                <div
                  key={`artist-card-${artist.name}-${idx}`}
                  onClick={() => {
                    if (onSelectArtist) {
                      onSelectArtist(artist.name);
                    } else {
                      setSelectedArtistModalName(artist.name);
                    }
                  }}
                  className="group relative bg-slate-900/70 hover:bg-slate-800/90 border border-white/10 hover:border-white/20 p-4 rounded-3xl transition-all duration-300 cursor-pointer shadow-lg flex flex-col items-center text-center shrink-0 w-40 sm:w-44"
                >
                  {/* Round Artist Avatar */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 bg-slate-950 shadow-md group-hover:scale-105 transition-transform">
                    <img
                      src={artist.coverUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (artist.tracks.length > 0) {
                          onPlayTrack(artist.tracks[0]);
                        }
                      }}
                      className="absolute inset-0 m-auto w-10 h-10 rounded-full flex items-center justify-center text-white shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                      style={{ backgroundColor: palette.primary }}
                      title={`Riproduci ${artist.name}`}
                    >
                      {isArtistPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Delete Artist Button on Hover */}
                  {onDeleteArtist && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Sei sicuro? Eliminare l'artista "${artist.name}" e tutti i suoi ${artist.tracks.length} brani?`
                          )
                        ) {
                          onDeleteArtist(
                            artist.originalName || artist.name,
                            artist.tracks.map((t) => t.id)
                          );
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 hover:bg-rose-600 text-slate-400 hover:text-white border border-white/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-md z-10"
                      title="Elimina artista e brani"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <h4 className="text-xs font-extrabold text-white truncate max-w-full font-['Outfit']">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                    {artist.albumsCount} {artist.albumsCount === 1 ? 'Album' : 'Album'} • {artist.tracks.length} Brani
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Le Mie Playlist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-white shadow-md"
              style={{ backgroundColor: palette.primary }}
            >
              <ListMusic className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-['Outfit'] tracking-tight">
              Le Mie Playlist
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/10">
              {playlists.length}
            </span>
          </div>
        </div>

        {playlists.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 text-center">
            <p className="text-xs text-slate-400">Non hai ancora creato nessuna playlist.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {playlists.map((pl, idx) => {
              const cover =
                pl.coverUrl ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
              const isDeleting = deletingPlaylistIds.has(pl.id);
              return (
                <div
                  key={`lib-pl-${pl.id}-${idx}`}
                  onClick={() => !isDeleting && onSelectPlaylist && onSelectPlaylist(pl.id)}
                  className={`group relative p-3 rounded-2xl transition-all duration-300 shadow-md flex flex-col justify-between border ${
                    isDeleting
                      ? 'bg-rose-950/40 border-rose-500/80 scale-90 opacity-40 blur-[0.5px] pointer-events-none'
                      : 'bg-slate-900/70 hover:bg-slate-800/90 border-white/10 hover:border-white/20 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-slate-950">
                      <img
                        src={cover}
                        alt={pl.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isDeleting && (
                        <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center z-20 animate-pulse">
                          <Trash2 className="w-5 h-5 text-rose-400 animate-bounce mb-1" />
                          <span className="text-[10px] font-extrabold text-rose-200">Eliminazione...</span>
                        </div>
                      )}
                      {!isDeleting && onPlayPlaylist && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayPlaylist(pl);
                          }}
                          className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                          style={{ backgroundColor: palette.primary }}
                          title="Riproduci playlist"
                        >
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </button>
                      )}
                      {!isDeleting && !pl.isSmart && onDeletePlaylist && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlaylistWithAnimation(pl.id, pl.name);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 hover:bg-rose-600 text-slate-400 hover:text-white border border-white/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-md z-10"
                          title="Elimina Playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate font-['Outfit']">
                      {pl.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {isDeleting ? (
                        <span className="text-rose-400 font-semibold animate-pulse">In eliminazione...</span>
                      ) : (
                        `${getPlaylistTrackCount(pl)} brani`
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cronologia Ascolti Recenti */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-white shadow-md"
              style={{ backgroundColor: palette.primary }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-['Outfit'] tracking-tight">
              Cronologia Ascolti Recenti
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/10">
              {recentlyPlayed.length}
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {recentlyPlayed.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isCurrentPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={`history-${track.id}-${idx}`}
                  onClick={() => onPlayTrack(track)}
                  className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-white/20 p-3 rounded-2xl transition-all duration-300 cursor-pointer shadow-md flex items-center gap-3 shrink-0 w-64"
                  style={{
                    borderColor: isCurrent ? palette.primary : undefined,
                  }}
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-950">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCurrentPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className="text-xs font-bold text-white truncate font-['Outfit']"
                      style={{ color: isCurrent ? palette.primary : undefined }}
                    >
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {track.artist}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono truncate block">
                      {track.album}
                    </span>
                  </div>

                  {/* Favorite Quick Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors shrink-0"
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Artist Details Modal Fallback (if parent doesn't handle modal) */}
      {!onSelectArtist && (
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
          onClose={() => setSelectedArtistModalName(null)}
          onPlayTrack={(track) => {
            onPlayTrack(track);
          }}
          onToggleFavorite={onToggleFavorite}
          onAddTrackToPlaylist={onAddTrackToPlaylist}
          onUpdateArtist={onUpdateArtist}
          onDeleteArtist={onDeleteArtist}
        />
      )}

    </div>
  );
};
