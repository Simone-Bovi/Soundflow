import { Playlist, Track } from '../types';

export const INITIAL_TRACKS: Track[] = [];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-favs',
    name: 'Brani Preferiti',
    description: 'La tua collezione personale di brani preferiti in alta fedeltà.',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    trackIds: [],
    colorTag: '',
    createdAt: '2026-07-20',
    isSmart: true,
    smartType: 'favorites',
  },
];

