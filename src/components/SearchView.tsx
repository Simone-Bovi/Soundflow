import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, MaterialPalette } from '../types';
import { Search, Shuffle, Play, Pause, Heart, Music, User, Disc, Disc3, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  palette: MaterialPalette;
  onPlayTrack: (track: Track, customUpcomingQueue?: Track[], contextName?: string) => void;
  onToggleFavorite: (id: string) => void;
  onSelectArtist?: (artistName: string) => void;
}

interface AlbumGroup {
  albumName: string;
  coverUrl: string;
  tracks: Track[];
}

interface ArtistGroup {
  artistName: string;
  coverUrl: string;
  totalTracksCount: number;
  allTracks: Track[];
  albums: AlbumGroup[];
}

// Helper to extract the main primary artist name (stripping feat, ft., featuring, &, commas, etc.)
const getMainArtist = (artistStr: string): string => {
  if (!artistStr) return 'Artista Sconosciuto';
  const regex = /\s+(?:feat\.?|ft\.?|featuring|&|x)\s+|,|;/i;
  const parts = artistStr.split(regex);
  return parts[0].trim() || 'Artista Sconosciuto';
};

export const SearchView: React.FC<SearchViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  palette,
  onPlayTrack,
  onToggleFavorite,
  onSelectArtist,
}) => {
  const [query, setQuery] = useState('');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [collapsedArtists, setCollapsedArtists] = useState<Record<string, boolean>>({});

  const toggleArtistCollapse = (artistName: string) => {
    setCollapsedArtists((prev) => ({
      ...prev,
      [artistName]: !prev[artistName],
    }));
  };

  // Filter tracks according to search query
  const filteredTracks = useMemo(() => {
    if (!query.trim()) return tracks;
    const q = query.toLowerCase().trim();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q)
    );
  }, [tracks, query]);

  // Group filtered tracks by main artist, and within artist by album
  const artistGroups = useMemo(() => {
    const artistMap = new Map<
      string,
      {
        artistName: string;
        coverUrl: string;
        allTracks: Track[];
        albumMap: Map<string, { albumName: string; coverUrl: string; tracks: Track[] }>;
      }
    >();

    filteredTracks.forEach((track) => {
      const mainArtist = getMainArtist(track.artist);
      const albumTitle = track.album?.trim() || 'Singoli & EP';

      if (!artistMap.has(mainArtist)) {
        artistMap.set(mainArtist, {
          artistName: mainArtist,
          coverUrl: track.coverUrl,
          allTracks: [],
          albumMap: new Map(),
        });
      }

      const artistEntry = artistMap.get(mainArtist)!;
      artistEntry.allTracks.push(track);

      if (!artistEntry.albumMap.has(albumTitle)) {
        artistEntry.albumMap.set(albumTitle, {
          albumName: albumTitle,
          coverUrl: track.coverUrl,
          tracks: [],
        });
      }

      artistEntry.albumMap.get(albumTitle)!.tracks.push(track);
    });

    const groupsArray: ArtistGroup[] = Array.from(artistMap.values()).map((entry) => ({
      artistName: entry.artistName,
      coverUrl: entry.coverUrl,
      totalTracksCount: entry.allTracks.length,
      allTracks: entry.allTracks,
      albums: Array.from(entry.albumMap.values()),
    }));

    // Shuffle artists randomly based on shuffleSeed or when user clicks shuffle
    const shuffled = [...groupsArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(Math.sin(shuffleSeed + i * 1.5)) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [filteredTracks, shuffleSeed]);

  const handleShuffleArtists = () => {
    setShuffleSeed((prev) => prev + 1);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-5">
      {/* Compact Search Bar & Controls */}
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
            style={{ color: query ? palette.primary : '#94a3b8' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca canzone, artista, album, genere..."
            className="w-full pl-11 pr-20 py-2.5 text-xs sm:text-sm font-medium rounded-full bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none transition-all shadow-md"
            style={{
              borderColor: query ? palette.primary : undefined,
              boxShadow: query ? `0 0 12px -3px ${palette.glowColor}` : undefined,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white p-1"
            >
              Cancella
            </button>
          )}
        </div>

        <button
          onClick={handleShuffleArtists}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-white/10 transition-all active:scale-95 shrink-0 shadow-md"
          title="Mescola ordine artisti"
        >
          <Shuffle className="w-3.5 h-3.5" style={{ color: palette.primary }} />
          <span className="hidden sm:inline">Mescola Artisti</span>
        </button>
      </div>

      {/* Artists Grouped Results */}
      {artistGroups.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/10 text-center space-y-3">
          <Music className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
          <p className="text-base font-bold text-slate-300">Nessun brano o artista trovato</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Prova a modificare i termini di ricerca o importa nuovi file audio nella tua libreria Soundflow.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {artistGroups.map((artistGroup, gIdx) => {
            const isCollapsed = Boolean(collapsedArtists[artistGroup.artistName]);

            return (
              <div
                key={`artist-group-${artistGroup.artistName}-${gIdx}`}
                className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 lg:p-6 rounded-3xl shadow-xl space-y-6"
              >
                {/* Artist Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div
                    onClick={() => toggleArtistCollapse(artistGroup.artistName)}
                    className="flex items-center gap-3.5 cursor-pointer group"
                    title={isCollapsed ? "Espandi artista" : "Comprimi artista"}
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-950 border border-white/10 shrink-0 shadow-md group-hover:border-white/30 transition-colors">
                      <img
                        src={artistGroup.coverUrl}
                        alt={artistGroup.artistName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-white/80" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white font-['Outfit'] tracking-tight group-hover:text-slate-200 transition-colors">
                          {artistGroup.artistName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-white/10">
                          {artistGroup.albums.length} {artistGroup.albums.length === 1 ? 'album' : 'album'} • {artistGroup.totalTracksCount} {artistGroup.totalTracksCount === 1 ? 'brano' : 'brani'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                        <span>Artista Principale</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          • {isCollapsed ? 'Clicca per espandere' : 'Clicca per comprimere'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {/* View Artist Profile / Modal */}
                    {onSelectArtist && (
                      <button
                        onClick={() => onSelectArtist(artistGroup.artistName)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all active:scale-95"
                        title="Vedi Profilo e Discografia"
                      >
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Discografia</span>
                      </button>
                    )}

                    {/* Play All Tracks from this Artist */}
                    <button
                      onClick={() => {
                        if (artistGroup.allTracks.length > 0) {
                          onPlayTrack(
                            artistGroup.allTracks[0],
                            artistGroup.allTracks.slice(1),
                            artistGroup.artistName
                          );
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                      style={{
                        backgroundColor: palette.primary,
                        boxShadow: `0 2px 10px -2px ${palette.glowColor}`,
                      }}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Riproduci Artista</span>
                    </button>

                    {/* Expand/Collapse Toggle Button */}
                    <button
                      onClick={() => toggleArtistCollapse(artistGroup.artistName)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-white/10 transition-all active:scale-95"
                      title={isCollapsed ? "Mostra brani e album" : "Nascondi brani e album"}
                    >
                      {isCollapsed ? (
                        <>
                          <span>Espandi</span>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </>
                      ) : (
                        <>
                          <span>Comprimi</span>
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-grouping by Albums under this Artist */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6 overflow-hidden"
                    >
                      {artistGroup.albums.map((album, aIdx) => {
                    return (
                      <div
                        key={`album-${artistGroup.artistName}-${album.albumName}-${aIdx}`}
                        className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl space-y-3"
                      >
                        {/* Album Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-white/10">
                              <img
                                src={album.coverUrl}
                                alt={album.albumName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Disc3 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <h4 className="text-sm font-bold text-white font-['Outfit'] truncate">
                                  {album.albumName}
                                </h4>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {album.tracks.length} {album.tracks.length === 1 ? 'traccia' : 'tracce'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              if (album.tracks.length > 0) {
                                onPlayTrack(
                                  album.tracks[0],
                                  album.tracks.slice(1),
                                  album.albumName
                                );
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all active:scale-95 shrink-0"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Riproduci Album</span>
                          </button>
                        </div>

                        {/* Tracks under Album */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {album.tracks.map((track, tIdx) => {
                            const isCurrent = currentTrack?.id === track.id;
                            const isCurrentPlaying = isCurrent && isPlaying;

                            return (
                              <div
                                key={`search-track-${artistGroup.artistName}-${album.albumName}-${track.id}-${tIdx}`}
                                onClick={() =>
                                  onPlayTrack(
                                    track,
                                    album.tracks.filter((t) => t.id !== track.id),
                                    album.albumName
                                  )
                                }
                                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                                  isCurrent
                                    ? 'bg-slate-800/90 border-white/25 shadow-md'
                                    : 'bg-slate-900/60 hover:bg-slate-800/60 border-white/5 hover:border-white/15'
                                }`}
                                style={{
                                  borderColor: isCurrent ? palette.primary : undefined,
                                }}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-white/10">
                                    <img
                                      src={track.coverUrl}
                                      alt={track.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div
                                      className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                                        isCurrent
                                          ? 'opacity-100'
                                          : 'opacity-0 group-hover:opacity-100'
                                      }`}
                                    >
                                      {isCurrentPlaying ? (
                                        <Pause className="w-3.5 h-3.5 text-white" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                                      )}
                                    </div>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h5
                                      className="text-xs font-bold text-white truncate font-['Outfit']"
                                      style={{ color: isCurrent ? palette.primary : undefined }}
                                    >
                                      {track.title}
                                    </h5>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {track.artist}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2 text-xs font-mono text-slate-400">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-extrabold text-slate-300 border border-white/10 hidden xl:inline-block">
                                    {track.format}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {formatTime(track.duration)}
                                  </span>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFavorite(track.id);
                                    }}
                                    className="p-1 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
                                    title={
                                      track.isFavorite
                                        ? 'Rimuovi dai preferiti'
                                        : 'Aggiungi ai preferiti'
                                    }
                                  >
                                    <Heart
                                      className={`w-3.5 h-3.5 ${
                                        track.isFavorite
                                          ? 'fill-rose-500 text-rose-500'
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
