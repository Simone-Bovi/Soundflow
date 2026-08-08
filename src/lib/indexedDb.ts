import { Playlist, Track } from '../types';

const DB_NAME = 'SonoraExpressiveDB';
const DB_VERSION = 2;
const TRACKS_STORE = 'tracks';
const PLAYLISTS_STORE = 'playlists';
const FAVORITES_STORE = 'favorites';
const MEDIA_STORE = 'media_covers';

export interface MediaCoverItem {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'playlist';
  dataUrl: string;
  size?: string;
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let res = e.target?.result as string;
      if (res && res.startsWith('data:application/octet-stream;')) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let mime = 'audio/mpeg';
        if (ext === 'flac') mime = 'audio/flac';
        else if (ext === 'wav') mime = 'audio/wav';
        else if (ext === 'm4a' || ext === 'aac') mime = 'audio/aac';
        else if (ext === 'ogg') mime = 'audio/ogg';
        res = res.replace('data:application/octet-stream;', `data:${mime};`);
      }
      resolve(res);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'audio/mpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('Error converting dataUrl to Blob:', e);
    return new Blob([], { type: 'audio/mpeg' });
  }
}

export async function saveTrackToDB(track: Track): Promise<void> {
  // If track has a dataUrl but no audioBlob, create and attach the audioBlob
  const trackToSave = { ...track };
  if (!trackToSave.audioBlob && trackToSave.audioUrl && trackToSave.audioUrl.startsWith('data:')) {
    try {
      trackToSave.audioBlob = dataUrlToBlob(trackToSave.audioUrl);
    } catch (e) {
      console.warn('Could not attach audioBlob from dataUrl:', e);
    }
  }

  // Strip transient blob: / data: audioUrl when storing to IndexedDB to minimize DB size & RAM
  if (trackToSave.audioBlob) {
    trackToSave.audioUrl = '';
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    store.put(trackToSave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllUserTracksFromDB(): Promise<Track[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readonly');
    const store = tx.objectStore(TRACKS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const storedTracks: Track[] = request.result || [];
      const processedTracks = storedTracks.map((t) => {
        // 1. Re-create live ObjectURL from stored binary Blob/File
        if (t.audioBlob && t.audioBlob instanceof Blob && t.audioBlob.size > 0) {
          try {
            t.audioUrl = URL.createObjectURL(t.audioBlob);
          } catch (e) {
            console.error('Failed to create ObjectURL from audioBlob:', e);
          }
        }
        // 2. Legacy data URL fallback: convert to Blob
        else if (t.audioUrl && t.audioUrl.startsWith('data:')) {
          try {
            const blob = dataUrlToBlob(t.audioUrl);
            t.audioBlob = blob;
            t.audioUrl = URL.createObjectURL(blob);
            saveTrackToDB(t).catch(() => {});
          } catch (e) {
            console.error('Failed to convert dataUrl to Blob:', e);
          }
        }
        return t;
      });
      resolve(processedTracks);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrackFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePlaylistToDB(playlist: Playlist): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = tx.objectStore(PLAYLISTS_STORE);
    store.put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPlaylistsFromDB(): Promise<Playlist[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLISTS_STORE, 'readonly');
    const store = tx.objectStore(PLAYLISTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlaylistFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = tx.objectStore(PLAYLISTS_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllDatabaseData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TRACKS_STORE, PLAYLISTS_STORE, MEDIA_STORE], 'readwrite');
    tx.objectStore(TRACKS_STORE).clear();
    tx.objectStore(PLAYLISTS_STORE).clear();
    tx.objectStore(MEDIA_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveMediaCoverToDB(cover: MediaCoverItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    const store = tx.objectStore(MEDIA_STORE);
    store.put(cover);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllMediaCoversFromDB(): Promise<MediaCoverItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const store = tx.objectStore(MEDIA_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMediaCoverFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    const store = tx.objectStore(MEDIA_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

