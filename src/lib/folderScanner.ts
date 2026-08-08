import { AudioFormat, Track, LyricLine } from '../types';
import { extractAudioMetadata, parseFilenameMetadata, parseM3uFile, getPrimaryArtist } from './metadataParser';
import { parseLrc, matchLrcToTrack } from './lrcParser';
import { fileToDataUrl, saveMediaCoverToDB } from './indexedDb';

export interface FolderImportResult {
  tracks: Track[];
  albumPlaylist?: {
    name: string;
    description: string;
    coverUrl?: string;
    trackIds: string[];
  };
  albumPlaylists?: {
    name: string;
    description: string;
    coverUrl?: string;
    trackIds: string[];
  }[];
  lyricsUpdated: number;
}

export interface FileWithPath {
  file: File;
  relativePath: string;
}

/**
 * Traverses DataTransferItems (from Drag & Drop) to get all files with their relative paths
 */
export async function getFilesFromDataTransferItems(items: DataTransferItemList): Promise<FileWithPath[]> {
  const fileEntries: FileWithPath[] = [];

  const traverseEntry = async (entry: any, path: string = ''): Promise<void> => {
    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file((f: File) => {
          fileEntries.push({
            file: f,
            relativePath: path ? `${path}/${f.name}` : f.name,
          });
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        const resultEntries: any[] = [];
        const readEntries = () => {
          dirReader.readEntries((batch: any[]) => {
            if (!batch.length) {
              resolve(resultEntries);
            } else {
              resultEntries.push(...batch);
              readEntries();
            }
          });
        };
        readEntries();
      });

      for (const childEntry of entries) {
        await traverseEntry(childEntry, path ? `${path}/${entry.name}` : entry.name);
      }
    }
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        promises.push(traverseEntry(entry));
      } else {
        const f = item.getAsFile();
        if (f) {
          fileEntries.push({
            file: f,
            relativePath: f.webkitRelativePath || f.name,
          });
        }
      }
    }
  }

  await Promise.all(promises);
  return fileEntries;
}

async function getAudioFileDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
    };

    const onLoaded = () => {
      const dur = audio.duration;
      cleanup();
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        resolve(Math.round(dur));
      } else {
        resolve(180);
      }
    };

    const onError = () => {
      cleanup();
      resolve(180);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);

    setTimeout(() => {
      if (audio.readyState >= 1 && audio.duration && !isNaN(audio.duration)) {
        onLoaded();
      } else {
        onError();
      }
    }, 3000);
  });
}

/**
 * Main processor for folder & file imports
 */
export async function processImportedFiles(
  filesWithPath: FileWithPath[],
  onUpdateTrackLyrics?: (trackId: string, lyrics: LyricLine[]) => void,
  existingTracks: Track[] = []
): Promise<FolderImportResult> {
  // 1. Group files by exact directory path (e.g. "Anna/Milion Dollar Babe" or "Milion Dollar Babe")
  const folderGroups = new Map<string, FileWithPath[]>();

  for (const item of filesWithPath) {
    const parts = item.relativePath.replace(/\\/g, '/').split('/');
    const dirPath = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Importati';
    if (!folderGroups.has(dirPath)) {
      folderGroups.set(dirPath, []);
    }
    folderGroups.get(dirPath)!.push(item);
  }

  const allNewTracks: Track[] = [];
  let lyricsCount = 0;
  const albumPlaylistsInfo: NonNullable<FolderImportResult['albumPlaylists']> = [];

  for (const [dirPath, items] of folderGroups.entries()) {
    const dirParts = dirPath.split('/');
    const albumFolder = dirParts[dirParts.length - 1];
    const artistFolder = dirParts.length >= 2 ? dirParts[0] : undefined;

    // A. Search for Cover Image in this folder
    let folderCoverUrl: string | undefined = undefined;

    const imageFiles = items.filter(({ file }) =>
      /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
    );

    const explicitCover = imageFiles.find(({ file }) => {
      const name = file.name.toLowerCase();
      return (
        name.includes('cover') ||
        name.includes('folder') ||
        name.includes('front') ||
        name.includes('art')
      );
    }) || imageFiles[0];

    if (explicitCover) {
      try {
        folderCoverUrl = await fileToDataUrl(explicitCover.file);
        saveMediaCoverToDB({
          id: `cover-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: `${albumFolder} (${explicitCover.file.name})`,
          type: 'album',
          dataUrl: folderCoverUrl,
          size: `${(explicitCover.file.size / 1024).toFixed(1)} KB`,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (e) {
        folderCoverUrl = URL.createObjectURL(explicitCover.file);
      }
    }

    // B. Search for M3U / M3U8 Playlist
    let m3uOrderedFilenames: string[] = [];
    const m3uFile = items.find(({ file }) =>
      /\.(m3u|m3u8)$/i.test(file.name)
    );

    if (m3uFile) {
      try {
        const content = await m3uFile.file.text();
        m3uOrderedFilenames = parseM3uFile(content);
      } catch (e) {
        console.warn('Could not read m3u file:', e);
      }
    }

    // C. Filter Audio Files
    const audioItems = items.filter(({ file }) =>
      /\.(flac|wav|mp3|m4a|ogg|aac)$/i.test(file.name)
    );

    // D. Process each audio file asynchronously
    const folderTracks: Track[] = [];

    for (let idx = 0; idx < audioItems.length; idx++) {
      const { file, relativePath } = audioItems[idx];
      const audioUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // Extract ID3 tags
      const id3 = await extractAudioMetadata(file);

      // Extract filename / folder metadata
      const fallback = parseFilenameMetadata(relativePath || file.name, albumFolder);

      // Determine fields with high precedence
      const finalTitle = id3.title || fallback.title || cleanTitle;
      const finalArtist =
        id3.artist ||
        (fallback.artist !== 'Artista Sconosciuto' ? fallback.artist : undefined) ||
        artistFolder ||
        'Artista Locale';
      const finalAlbum =
        id3.album ||
        (fallback.album !== 'Album Importato' && fallback.album !== albumFolder
          ? fallback.album
          : albumFolder) ||
        'Album Importato';
      const finalTrackNum = id3.trackNumber ?? fallback.trackNum ?? (idx + 1);
      const finalYear = id3.year || 2026;

      // Cover URL precedence: Folder Cover.jpg > ID3 embedded cover > fallback image
      const finalCoverUrl =
        folderCoverUrl ||
        id3.embeddedCoverUrl ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

      // Format specs
      let format: AudioFormat = 'MP3';
      let bitrate = '320 kbps MP3';
      if (ext === 'flac') {
        format = 'FLAC';
        bitrate = '24-bit / 96.0 kHz FLAC';
      } else if (ext === 'wav') {
        format = 'Hi-Res WAV';
        bitrate = '24-bit / 192.0 kHz WAV';
      } else if (ext === 'm4a' || ext === 'aac') {
        format = 'AAC';
        bitrate = '256 kbps AAC';
      } else if (ext === 'ogg') {
        format = 'OGG';
        bitrate = '320 kbps OGG';
      }

      const realDuration = await getAudioFileDuration(file);

      const trackId = `imported-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 8)}`;

      const newTrack: Track = {
        id: trackId,
        title: finalTitle,
        artist: finalArtist,
        album: finalAlbum,
        duration: realDuration,
        coverUrl: finalCoverUrl,
        audioUrl,
        audioBlob: file,
        format,
        bitrate,
        channels: '2.0 Uncompressed Lossless',
        genre: id3.genre || 'Musica Locale',
        year: finalYear,
        isFavorite: false,
        addedAt: new Date().toISOString().split('T')[0],
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        isUserUploaded: true,
      };

      folderTracks.push(newTrack);
    }

    // E. Sort tracks based on .m3u order, track number, or title
    if (m3uOrderedFilenames.length > 0) {
      folderTracks.sort((a, b) => {
        const aName = (a.title + '.').toLowerCase();
        const bName = (b.title + '.').toLowerCase();

        const indexA = m3uOrderedFilenames.findIndex((m) =>
          aName.includes(m) || m.includes(aName)
        );
        const indexB = m3uOrderedFilenames.findIndex((m) =>
          bName.includes(m) || m.includes(bName)
        );

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });
    } else {
      folderTracks.sort((a, b) => {
        const aNum = parseFilenameMetadata(a.title).trackNum;
        const bNum = parseFilenameMetadata(b.title).trackNum;
        if (aNum !== undefined && bNum !== undefined) return aNum - bNum;
        return a.title.localeCompare(b.title);
      });
    }

    allNewTracks.push(...folderTracks);

    // If folder represents an album with multiple tracks, generate album playlist info
    if (folderTracks.length > 0 && dirPath !== 'Importati') {
      const albumArtist = getPrimaryArtist(folderTracks[0]?.artist || artistFolder || 'Artista');
      const albumTitle = folderTracks[0]?.album || albumFolder;

      albumPlaylistsInfo.push({
        name: `${albumTitle} - ${albumArtist}`,
        description: ``,
        coverUrl: folderCoverUrl || folderTracks[0]?.coverUrl,
        trackIds: folderTracks.map((t) => t.id),
      });
    }

    // F. Process LRC files in this folder
    const lrcFiles = items.filter(({ file }) => file.name.toLowerCase().endsWith('.lrc') || file.name.toLowerCase().endsWith('.txt'));
    for (const lrcItem of lrcFiles) {
      try {
        const text = await lrcItem.file.text();
        const availableTracks = [...folderTracks, ...allNewTracks, ...existingTracks];
        const matchedResult = matchLrcToTrack(text, lrcItem.file.name, availableTracks);

        if (matchedResult && onUpdateTrackLyrics) {
          onUpdateTrackLyrics(matchedResult.track.id, matchedResult.parsed.lyrics);
          lyricsCount++;
        }
      } catch (e) {
        console.warn('Could not read LRC file:', e);
      }
    }
  }

  return {
    tracks: allNewTracks,
    albumPlaylist: albumPlaylistsInfo[0],
    albumPlaylists: albumPlaylistsInfo,
    lyricsUpdated: lyricsCount,
  };
}
