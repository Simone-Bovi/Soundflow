import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, Track, LyricLine, TransitionSpeed } from '../types';
import { Upload, X, FileAudio, CheckCircle2, FileText, FolderPlus, Music, Loader2, Crop } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';
import { matchLrcToTrack } from '../lib/lrcParser';
import { saveTrackToDB } from '../lib/indexedDb';
import { getAnimDuration } from '../lib/animUtils';
import {
  FileWithPath,
  getFilesFromDataTransferItems,
  processImportedFiles,
} from '../lib/folderScanner';
import { open as openTauriDialog } from '@tauri-apps/plugin-dialog';
import { readFile as readTauriFile, readDir as readTauriDir } from '@tauri-apps/plugin-fs';

interface ImportFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  palette: MaterialPalette;
  tracks?: Track[];
  transitionSpeed?: TransitionSpeed;
  onAddTracks: (tracks: Track[]) => void;
  onUpdateTrackLyrics?: (trackId: string, lyrics: LyricLine[]) => void;
}

export const ImportFilesModal: React.FC<ImportFilesModalProps> = ({
  isOpen,
  onClose,
  palette,
  tracks = [],
  transitionSpeed,
  onAddTracks,
  onUpdateTrackLyrics,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedList, setImportedList] = useState<Track[]>([]);
  const [lyricsStatus, setLyricsStatus] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropTrackId, setCropTrackId] = useState<string | null>(null);

  const duration = getAnimDuration(transitionSpeed);

  const isTauriEnv = typeof window !== 'undefined' && '__TAURI__' in window;

  const handleTauriFilePick = async () => {
    try {
      const selected = await openTauriDialog({
        multiple: true,
        filters: [
          {
            name: 'Audio & LRC',
            extensions: ['flac', 'wav', 'mp3', 'm4a', 'ogg', 'aac', 'lrc', 'txt', 'jpg', 'jpeg', 'png', 'webp', 'm3u'],
          },
        ],
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      if (paths.length === 0) return;

      setIsProcessing(true);
      const filesWithPath: FileWithPath[] = [];
      for (const p of paths) {
        try {
          const contents = await readTauriFile(p);
          const name = p.split(/[/\\]/).pop() || 'audio.mp3';
          const file = new File([contents], name);
          filesWithPath.push({ file, relativePath: name });
        } catch (err) {
          console.error('Error reading native file:', p, err);
        }
      }
      if (filesWithPath.length > 0) {
        await handleProcessFiles(filesWithPath);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Native file dialog error:', err);
      setIsProcessing(false);
    }
  };

  const handleTauriFolderPick = async () => {
    try {
      const selectedFolder = await openTauriDialog({
        directory: true,
        multiple: false,
      });
      if (!selectedFolder || typeof selectedFolder !== 'string') return;

      setIsProcessing(true);

      const readRecursive = async (dirPath: string, relativePrefix = ''): Promise<FileWithPath[]> => {
        let results: FileWithPath[] = [];
        try {
          const entries = await readTauriDir(dirPath);
          for (const entry of entries) {
            const entryPath = `${dirPath}/${entry.name}`;
            const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
            if (entry.isDirectory) {
              const sub = await readRecursive(entryPath, relPath);
              results = results.concat(sub);
            } else if (entry.isFile) {
              try {
                const contents = await readTauriFile(entryPath);
                const file = new File([contents], entry.name);
                results.push({ file, relativePath: relPath });
              } catch (readErr) {
                console.error('Failed to read file:', entryPath, readErr);
              }
            }
          }
        } catch (dirErr) {
          console.error('Failed to read dir:', dirPath, dirErr);
        }
        return results;
      };

      const filesWithPath = await readRecursive(selectedFolder);
      if (filesWithPath.length > 0) {
        await handleProcessFiles(filesWithPath);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Native folder dialog error:', err);
      setIsProcessing(false);
    }
  };

  const allAvailableTracks = React.useMemo(() => {
    const map = new Map<string, Track>();
    tracks.forEach((t) => map.set(t.id, t));
    importedList.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [tracks, importedList]);

  const handleProcessFiles = async (filesWithPath: FileWithPath[]) => {
    setIsProcessing(true);
    setLyricsStatus(null);
    try {
      const result = await processImportedFiles(
        filesWithPath,
        onUpdateTrackLyrics,
        allAvailableTracks
      );

      if (result.tracks.length > 0) {
        setImportedList((prev) => [...prev, ...result.tracks]);
        onAddTracks(result.tracks);
        setTimeout(() => {
          onClose();
        }, 400);
      }

      const hasLrcFiles = filesWithPath.some((f) =>
        f.file.name.toLowerCase().endsWith('.lrc') || f.file.name.toLowerCase().endsWith('.txt')
      );

      if (result.lyricsUpdated > 0) {
        setLyricsStatus(`Sincronizzati ${result.lyricsUpdated} testi .LRC con successo!`);
      } else if (hasLrcFiles && result.tracks.length === 0) {
        setLyricsStatus(
          `Nessun brano corrispondente trovato per i file .LRC. Assicurati che il nome file o i tag [ti:] / [ar:] corrispondano ai brani.`
        );
      }
    } catch (error) {
      console.error('Error during file import processing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const filesWithPath = await getFilesFromDataTransferItems(e.dataTransfer.items);
      if (filesWithPath.length > 0) {
        await handleProcessFiles(filesWithPath);
      }
    } else if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files) as File[];
      const filesWithPath: FileWithPath[] = fileList.map((f) => ({
        file: f,
        relativePath: f.webkitRelativePath || f.name,
      }));
      await handleProcessFiles(filesWithPath);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files) as File[];
      const filesWithPath: FileWithPath[] = fileList.map((f) => ({
        file: f,
        relativePath: f.webkitRelativePath || f.name,
      }));
      await handleProcessFiles(filesWithPath);
      e.target.value = '';
    }
  };

  const handleLrcBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files) as File[];
    let matchedCount = 0;
    const matchedTrackNames: string[] = [];

    setIsProcessing(true);
    for (const file of files) {
      try {
        const text = await file.text();
        const matchedResult = matchLrcToTrack(text, file.name, allAvailableTracks);
        if (matchedResult && onUpdateTrackLyrics) {
          onUpdateTrackLyrics(matchedResult.track.id, matchedResult.parsed.lyrics);
          matchedCount++;
          matchedTrackNames.push(matchedResult.track.title);
        }
      } catch (err) {
        console.error('Error matching LRC file:', file.name, err);
      }
    }
    setIsProcessing(false);

    if (matchedCount > 0) {
      const uniqueNames = Array.from(new Set(matchedTrackNames));
      const sampleStr = uniqueNames.slice(0, 3).join(', ') + (uniqueNames.length > 3 ? '...' : '');
      setLyricsStatus(`Sincronizzati con successo ${matchedCount} file .LRC per: ${sampleStr}`);
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setLyricsStatus(
        `Nessun brano corrispondente trovato per i file .LRC. Verifica che il nome file o i tag del testo rispecchino il titolo del brano.`
      );
    }

    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="import-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            key="import-modal-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[32px] p-6 lg:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl text-white shadow-md"
              style={{ backgroundColor: palette.primary }}
            >
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-['Outfit']">
                Importa Album & Cartelle Musica
              </h3>
              <p className="text-xs text-slate-400">
                Supporta Cover.jpg, ordinamento .m3u, tag ID3 e file .lrc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Folder Import Button */}
          <div>
            {!isTauriEnv && (
              <input
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFileInput}
                className="hidden"
                id="folder-input"
              />
            )}
            <label
              htmlFor={isTauriEnv ? undefined : 'folder-input'}
              onClick={isTauriEnv ? handleTauriFolderPick : undefined}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-white/10 transition-all shadow-md active:scale-95"
            >
              <FolderPlus className="w-4 h-4 shrink-0" style={{ color: palette.primary }} />
              <span>Importa Cartella Album</span>
            </label>
          </div>

          {/* Files Import Button */}
          <div>
            {!isTauriEnv && (
              <input
                type="file"
                multiple
                accept=".flac,.wav,.mp3,.m4a,.ogg,.aac,.lrc"
                onChange={handleFileInput}
                className="hidden"
                id="audio-file-input"
              />
            )}
            <label
              htmlFor={isTauriEnv ? undefined : 'audio-file-input'}
              onClick={isTauriEnv ? handleTauriFilePick : undefined}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-white/10 transition-all shadow-md active:scale-95"
            >
              <Music className="w-4 h-4 shrink-0" style={{ color: palette.secondary || '#38bdf8' }} />
              <span>Seleziona File Audio</span>
            </label>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
            isDragging
              ? 'border-indigo-400 bg-indigo-950/40 scale-102'
              : 'border-white/20 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-950/80'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center py-4 space-y-3">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: palette.primary }} />
              <span className="text-sm font-bold text-white">
                Lettura metadati ID3, Cover.jpg e playlist .m3u in corso...
              </span>
            </div>
          ) : (
            <label htmlFor="folder-input" className="cursor-pointer flex flex-col items-center">
              <FileAudio className="w-12 h-12 mb-3 animate-bounce" style={{ color: palette.primary }} />
              <span className="text-sm font-bold text-white">
                Trascina qui la Cartella dell'Album o i tuoi file audio
              </span>
              <span className="text-xs text-slate-400 mt-2 max-w-sm">
                Legge automaticamente <strong>Cover.jpg</strong> per l'album, l'ordine dei brani dal file <strong>.m3u</strong> e l'artista dai tag ID3.
              </span>
            </label>
          )}
        </div>

        {/* Direct .LRC file upload */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
              <FileText className="w-4 h-4" style={{ color: palette.primary }} />
            </div>
            <div>
              <p className="font-bold text-white text-xs">Carica Testi .LRC</p>
              <p className="text-[11px] text-slate-400">Sincronizzazione automatica per uno o più file .lrc</p>
            </div>
          </div>

          <input
            type="file"
            multiple
            accept=".lrc,.txt"
            onChange={handleLrcBatchUpload}
            className="hidden"
            id="batch-lrc-input"
          />
          <label
            htmlFor="batch-lrc-input"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold cursor-pointer border border-white/10 transition-all shrink-0 shadow-sm active:scale-95 w-full sm:w-auto"
          >
            <Upload className="w-4 h-4" style={{ color: palette.primary }} />
            <span>Carica .LRC</span>
          </label>
        </div>

        {/* Feedback: Lyrics status */}
        {lyricsStatus && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lyricsStatus}</span>
          </div>
        )}

        {/* Feedback: Imported tracks list */}
        {importedList.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between font-bold text-white border-b border-white/10 pb-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Brani Importati ({importedList.length}):
              </span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              {importedList.map((t, idx) => (
                <li key={`${t.id}-${idx}`} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative group shrink-0 w-7 h-7">
                      <img src={t.coverUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setCropTrackId(t.id);
                          setCropImageSrc(t.coverUrl);
                          setIsCropperOpen(true);
                        }}
                        className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        title="Regola & Centra Copertina"
                      >
                        <Crop className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white mr-1">{idx + 1}. {t.title}</span>
                      <span className="text-slate-400">— {t.artist} ({t.album})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCropTrackId(t.id);
                        setCropImageSrc(t.coverUrl);
                        setIsCropperOpen(true);
                      }}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Regola / Centra Copertina"
                    >
                      <Crop className="w-3 h-3 text-emerald-400" />
                    </button>
                    <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-slate-400 border border-white/5">
                      {t.format}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-bold text-xs text-white transition-all active:scale-95"
            style={{
              backgroundColor: palette.primary,
              boxShadow: `0 4px 16px -3px ${palette.glowColor}`,
            }}
          >
            Completato
          </button>
        </div>
      </motion.div>

      {(() => {
        const selectedCropTrack = importedList.find((t) => t.id === cropTrackId);
        return (
          <ImageCropModal
            isOpen={isCropperOpen}
            transitionSpeed={transitionSpeed}
            onClose={() => {
              setIsCropperOpen(false);
              setCropTrackId(null);
            }}
            imageSrc={selectedCropTrack?.originalCoverUrl || selectedCropTrack?.coverUrl || cropImageSrc}
            title="Regola & Centra Copertina Album"
            initialShape="square"
            palette={palette}
            initialZoom={selectedCropTrack?.cropParams?.zoom || 1}
            initialOffsetX={selectedCropTrack?.cropParams?.offsetX || 0}
            initialOffsetY={selectedCropTrack?.cropParams?.offsetY || 0}
            onConfirm={(croppedUrl, rawImageSrc, params) => {
              if (cropTrackId) {
                setImportedList((prev) =>
                  prev.map((t) => {
                    if (t.id === cropTrackId) {
                      const updated = { ...t, coverUrl: croppedUrl, originalCoverUrl: rawImageSrc, cropParams: params };
                      saveTrackToDB(updated).catch(() => {});
                      return updated;
                    }
                    return t;
                  })
                );
              }
              setIsCropperOpen(false);
              setCropTrackId(null);
            }}
          />
        );
      })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
