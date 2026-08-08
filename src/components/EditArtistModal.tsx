import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, TransitionSpeed } from '../types';
import { X, Upload, Image as ImageIcon, Check, User, FileText, Crop } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';
import { saveMediaCoverToDB } from '../lib/indexedDb';
import { getAnimDuration } from '../lib/animUtils';

interface EditArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist: {
    originalName: string;
    name: string;
    coverUrl: string;
    originalCoverUrl?: string;
    cropParams?: { zoom: number; offsetX: number; offsetY: number };
    bio?: string;
  };
  palette: MaterialPalette;
  transitionSpeed?: TransitionSpeed;
  onSave: (updated: {
    originalName: string;
    name: string;
    coverUrl: string;
    originalCoverUrl?: string;
    cropParams?: { zoom: number; offsetX: number; offsetY: number };
    bio?: string;
  }) => void;
}

export const EditArtistModal: React.FC<EditArtistModalProps> = ({
  isOpen,
  onClose,
  artist,
  palette,
  transitionSpeed,
  onSave,
}) => {
  const [name, setName] = useState(artist.name);
  const [coverUrl, setCoverUrl] = useState(artist.coverUrl);
  const [originalCoverUrl, setOriginalCoverUrl] = useState(artist.originalCoverUrl || artist.coverUrl);
  const [cropParams, setCropParams] = useState(artist.cropParams || { zoom: 1, offsetX: 0, offsetY: 0 });
  const [bio, setBio] = useState(artist.bio || '');
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const duration = getAnimDuration(transitionSpeed);

  useEffect(() => {
    if (isOpen) {
      setName(artist.name || '');
      setCoverUrl(artist.coverUrl || '');
      setOriginalCoverUrl(artist.originalCoverUrl || artist.coverUrl || '');
      setCropParams(artist.cropParams || { zoom: 1, offsetX: 0, offsetY: 0 });
      setBio(artist.bio || '');
    }
  }, [isOpen, artist]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setCropImageSrc(dataUrl);
          setOriginalCoverUrl(dataUrl);
          setIsCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleOpenCropperForCurrent = () => {
    const fullPhoto = originalCoverUrl || coverUrl;
    if (fullPhoto) {
      setCropImageSrc(fullPhoto);
      setIsCropperOpen(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();
    const finalCoverUrl = coverUrl.trim() || artist.coverUrl;

    if (finalCoverUrl) {
      const oldKey = (artist.originalName || artist.name || trimmedName).toLowerCase();
      const newKey = trimmedName.toLowerCase();

      saveMediaCoverToDB({
        id: `artist-${oldKey}`,
        name: `Foto Artista: ${trimmedName}`,
        type: 'artist',
        dataUrl: finalCoverUrl,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});

      if (newKey !== oldKey) {
        saveMediaCoverToDB({
          id: `artist-${newKey}`,
          name: `Foto Artista: ${trimmedName}`,
          type: 'artist',
          dataUrl: finalCoverUrl,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    onSave({
      originalName: artist.originalName,
      name: trimmedName,
      coverUrl: finalCoverUrl,
      originalCoverUrl,
      cropParams,
      bio: bio.trim(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="edit-artist-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden"
          onClick={() => {
            if (!isCropperOpen) onClose();
          }}
        >
          <motion.div
            key="edit-artist-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-[32px] overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl text-white shadow-lg"
              style={{ backgroundColor: palette.primary }}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white font-['Outfit']">
                Modifica Artista
              </h3>
              <p className="text-xs text-slate-400">Personalizza nome, immagine e biografia</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative w-28 h-28 rounded-full overflow-hidden shadow-xl bg-slate-950 group">
              <img
                src={coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                alt="Artist Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold gap-1"
              >
                <Upload className="w-5 h-5" />
                <span>Cambia</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" style={{ color: palette.primary }} />
                <span>Carica Foto</span>
              </button>

              {coverUrl && (
                <button
                  type="button"
                  onClick={handleOpenCropperForCurrent}
                  className="px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors"
                  title="Regola posizionamento e zoom della copertina"
                >
                  <Crop className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Regola & Centra Foto</span>
                </button>
              )}
            </div>
          </div>

          {/* Nome Artista */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Nome Artista
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il nome dell'artista"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 font-medium"
              required
            />
          </div>

          {/* URL Immagine Manuale */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              URL Immagine / Copertina (Opzionale)
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 font-mono text-xs"
            />
          </div>

          {/* Biografia / Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Biografia / Descrizione</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Scrivi una breve biografia per questo artista..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 font-medium resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white flex items-center gap-2 shadow-xl transition-transform active:scale-95"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 4px 16px -2px ${palette.glowColor}`,
              }}
            >
              <Check className="w-4 h-4" />
              <span>Salva Modifiche</span>
            </button>
          </div>
        </form>
      </motion.div>

      <ImageCropModal
        isOpen={isCropperOpen}
        transitionSpeed={transitionSpeed}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={cropImageSrc}
        title="Regola & Centra Foto Artista"
        initialShape="circle"
        palette={palette}
        initialZoom={cropParams.zoom}
        initialOffsetX={cropParams.offsetX}
        initialOffsetY={cropParams.offsetY}
        onConfirm={(croppedUrl, rawImageSrc, params) => {
          setCoverUrl(croppedUrl);
          setOriginalCoverUrl(rawImageSrc);
          setCropParams(params);
          setIsCropperOpen(false);
          saveMediaCoverToDB({
            id: `artist-${artist.originalName || artist.name}`,
            name: `Foto Artista: ${artist.name}`,
            type: 'artist',
            dataUrl: croppedUrl,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }}
      />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
