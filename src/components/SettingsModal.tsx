import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, Track, TransitionSpeed } from '../types';
import { Settings, X, Palette, Upload, Trash2, Check, HardDrive, Users, Music, Sparkles, Sliders, Zap, ZapOff, Activity, Volume2, VolumeX, Database, RefreshCw, Monitor } from 'lucide-react';
import { getPrimaryArtist } from '../lib/metadataParser';
import { MusicWrappedView } from './MusicWrappedView';
import { getAnimDuration } from '../lib/animUtils';
import { BG_THEME_PRESETS } from '../lib/colorExtractor';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  palette: MaterialPalette;
  onSelectThemeColor: (colorHex: string) => void;
  bgTheme?: string;
  onSelectBgTheme?: (bgTheme: string) => void;
  onOpenImportModal: () => void;
  onClearLibrary: () => void;
  onClearOrphanedMetadata?: () => Promise<{ removedProfilesCount: number; removedCoversCount: number; totalCleaned: number }>;
  trackCount: number;
  tracks?: Track[];
  transitionSpeed?: TransitionSpeed;
  onSetTransitionSpeed?: (speed: TransitionSpeed) => void;
  crossfadeSeconds?: number;
  onSetCrossfadeSeconds?: (seconds: number) => void;
}

const PRESET_COLORS = [
  { name: 'Verde Sonora', hex: '#1DB954' },
  { name: 'Viola Material', hex: '#8b5cf6' },
  { name: 'Blu Elettrico', hex: '#3b82f6' },
  { name: 'Arancio Sunset', hex: '#f97316' },
  { name: 'Rosso Rosa', hex: '#f43f5e' },
  { name: 'Ciano Atmos', hex: '#06b6d4' },
  { name: 'Smeraldo', hex: '#10b981' },
  { name: 'Oro Ambra', hex: '#eab308' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  palette,
  onSelectThemeColor,
  bgTheme = 'classic_dark',
  onSelectBgTheme,
  onOpenImportModal,
  onClearLibrary,
  onClearOrphanedMetadata,
  trackCount,
  tracks = [],
  transitionSpeed = 'normal' as TransitionSpeed,
  onSetTransitionSpeed,
  crossfadeSeconds = 2,
  onSetCrossfadeSeconds,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'wrapped'>('general');
  const [customHex, setCustomHex] = useState(palette.primary);
  const [customBgHex, setCustomBgHex] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [isCleaningMetadata, setIsCleaningMetadata] = useState(false);
  const [metadataCleanResult, setMetadataCleanResult] = useState<string | null>(null);

  const { artistCount, totalStorageFormatted } = useMemo(() => {
    if (!tracks || tracks.length === 0) {
      return { artistCount: 0, totalStorageFormatted: '0 MB' };
    }

    const uniqueArtists = new Set<string>();
    let totalBytes = 0;

    tracks.forEach((track) => {
      const primaryArtist = getPrimaryArtist(track.artist).trim();
      if (primaryArtist) {
        uniqueArtists.add(primaryArtist);
      }

      if (track.audioBlob && typeof track.audioBlob.size === 'number') {
        totalBytes += track.audioBlob.size;
      } else if (track.fileSize) {
        const match = track.fileSize.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
        if (match) {
          const val = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          if (unit === 'GB') totalBytes += val * 1024 * 1024 * 1024;
          else if (unit === 'MB') totalBytes += val * 1024 * 1024;
          else if (unit === 'KB') totalBytes += val * 1024;
          else totalBytes += val;
        } else {
          totalBytes += 8 * 1024 * 1024;
        }
      } else {
        const durationMin = (track.duration || 180) / 60;
        const mb = track.format === 'FLAC' || track.format === 'Hi-Res WAV' ? durationMin * 7 : durationMin * 2.5;
        totalBytes += Math.max(1, mb) * 1024 * 1024;
      }
    });

    let formatted = '0 MB';
    if (totalBytes < 1024 * 1024) {
      formatted = `${(totalBytes / 1024).toFixed(1)} KB`;
    } else if (totalBytes < 1024 * 1024 * 1024) {
      formatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      formatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    return {
      artistCount: uniqueArtists.size,
      totalStorageFormatted: formatted,
    };
  }, [tracks]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#[0-9A-F]{6}$/i.test(customHex)) {
      onSelectThemeColor(customHex);
    }
  };

  const duration = getAnimDuration(transitionSpeed);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            key="settings-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between p-6 lg:p-8 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="p-3 rounded-2xl text-white shadow-md"
                style={{ backgroundColor: palette.primary }}
              >
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white font-['Outfit']">
                  Pannello Impostazioni
                </h3>
                <p className="text-xs text-slate-400">
                  Personalizza tema, colore di navigazione, gestione libreria e ascolti
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 px-6 lg:px-8 pb-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'general'
                  ? 'bg-slate-800 text-white shadow-md border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                activeTab === 'general'
                  ? { borderColor: `${palette.primary}60` }
                  : undefined
              }
            >
              <Sliders className="w-4 h-4" style={{ color: activeTab === 'general' ? palette.primary : undefined }} />
              <span>Generali & Audio</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'appearance'
                  ? 'bg-slate-800 text-white shadow-md border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                activeTab === 'appearance'
                  ? { borderColor: `${palette.primary}60` }
                  : undefined
              }
            >
              <Palette className="w-4 h-4" style={{ color: activeTab === 'appearance' ? palette.primary : undefined }} />
              <span>Aspetto & UI</span>
            </button>

            <button
              onClick={() => setActiveTab('wrapped')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'wrapped'
                  ? 'bg-slate-800 text-white shadow-md border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                activeTab === 'wrapped'
                  ? { borderColor: `${palette.primary}60` }
                  : undefined
              }
            >
              <Sparkles className="w-4 h-4 animate-pulse" style={{ color: palette.primary }} />
              <span>Dati di Ascolto</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 lg:p-8 pt-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          
          {activeTab === 'wrapped' ? (
            <MusicWrappedView palette={palette} tracks={tracks} />
          ) : activeTab === 'appearance' ? (
            <>
              {/* Section 1: Color Theme Picker */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Palette className="w-4 h-4" style={{ color: palette.primary }} /> Colore dei Tasti & Tema UI
                </h4>
                <p className="text-xs text-slate-400">
                  Unifica lo stile grafico scegliendo un colore accent per tutti i pulsanti ed elementi attivi.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {PRESET_COLORS.map((item, idx) => {
                    const isSelected = palette.primary.toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={`preset-color-${item.hex}-${idx}`}
                        onClick={() => onSelectThemeColor(item.hex)}
                        className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition-all min-w-0 ${
                          isSelected ? 'text-white scale-105' : 'border-white/5 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                        }`}
                        style={{
                          borderColor: isSelected ? palette.primary : undefined,
                          backgroundColor: isSelected ? palette.primaryContainer : undefined,
                          boxShadow: isSelected ? `0 4px 18px -4px ${palette.glowColor}` : undefined,
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: item.hex }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-xs font-bold leading-tight whitespace-normal text-left min-w-0 flex-1">{item.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hex Form */}
                <form onSubmit={handleApplyCustom} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    placeholder="#1DB954"
                    className="px-3.5 py-2 text-xs font-mono rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-full text-white transition-all active:scale-95 shrink-0"
                    style={{
                      backgroundColor: palette.primary,
                      boxShadow: `0 4px 14px -3px ${palette.glowColor}`,
                    }}
                  >
                    Applica Hex
                  </button>
                </form>
              </div>

              {/* Section 1B: Detached Background Theme */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Monitor className="w-4 h-4" style={{ color: palette.primary }} /> Tema Sfondo (Indipendente)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-white/10">
                    Scollegato dai Pulsanti
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Personalizza la tonalità di sfondo dell'applicazione in modo del tutto indipendente dal colore dei tasti.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {BG_THEME_PRESETS.map((preset) => {
                    const isSelected =
                      bgTheme === preset.id ||
                      (preset.id === 'classic_dark' && (!bgTheme || bgTheme === 'classic_dark'));
                    return (
                      <button
                        key={`bg-preset-${preset.id}`}
                        onClick={() => onSelectBgTheme && onSelectBgTheme(preset.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all min-w-0 ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-lg border-white/30 scale-[1.02]'
                            : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                        style={{
                          borderColor: isSelected ? palette.primary : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {preset.surface ? (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: preset.surface }}
                              />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: palette.primary }} />
                            )}
                            <span className="text-xs font-bold truncate">{preset.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: palette.primary }} />}
                        </div>
                        <span className="text-[10px] text-slate-400 leading-tight">{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom BG Hex Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customBgHex && /^#[0-9A-F]{6}$/i.test(customBgHex.trim())) {
                      onSelectBgTheme && onSelectBgTheme(customBgHex.trim());
                      setCustomBgHex('');
                    }
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={customBgHex}
                    onChange={(e) => setCustomBgHex(e.target.value)}
                    placeholder="#0f172a (Hex Sfondo)"
                    className="px-3.5 py-1.5 text-xs font-mono rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-xl text-white transition-all bg-slate-800 hover:bg-slate-700 border border-white/10 shrink-0"
                  >
                    Applica Sfondo Hex
                  </button>
                </form>
              </div>

              {/* Section 2: Transitions & Animations Speed */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: palette.primary }} />
                    <span className="text-xs font-bold text-white">Velocità Transizioni & Animazioni</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-white/10">
                    {transitionSpeed === 'disabled'
                      ? 'Disattivato'
                      : transitionSpeed === 'fast'
                      ? 'Veloce (150ms)'
                      : transitionSpeed === 'slow'
                      ? 'Lento (600ms)'
                      : 'Normale (300ms)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Regola la velocità o disattiva le animazioni per un'interfaccia istantanea o più fluida.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      { id: 'disabled', label: 'Disattivate', icon: ZapOff, desc: 'No animazioni (0ms)' },
                      { id: 'fast', label: 'Veloci', icon: Zap, desc: 'Scattanti (150ms)' },
                      { id: 'normal', label: 'Normali', icon: Activity, desc: 'Standard (300ms)' },
                      { id: 'slow', label: 'Lente', icon: Sliders, desc: 'Fluide (600ms)' },
                    ] as { id: TransitionSpeed; label: string; icon: any; desc: string }[]
                  ).map((item) => {
                    const isSelected = transitionSpeed === item.id;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={`trans-speed-btn-${item.id}`}
                        onClick={() => onSetTransitionSpeed && onSetTransitionSpeed(item.id)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-lg border-white/30'
                            : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                        style={{
                          borderColor: isSelected ? palette.primary : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <IconComp
                            className="w-4 h-4"
                            style={{ color: isSelected ? palette.primary : undefined }}
                          />
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{item.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Section 3: Audio Crossfade / Fade In & Out */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" style={{ color: palette.primary }} />
                    <span className="text-xs font-bold text-white">Sfumatura Brani (Fade In / Out)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-white/10">
                    {crossfadeSeconds === 0 ? 'Disattivata' : `${crossfadeSeconds} Secondi`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Abilita una transizione morbida in ingresso e in uscita (crossfade) all'inizio, alla fine e durante il cambio canzone.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { sec: 0, label: 'Disattivato', desc: 'Istantaneo (0s)', icon: VolumeX },
                    { sec: 1, label: '1 sec', desc: 'Sfumatura rapida', icon: Volume2 },
                    { sec: 2, label: '2 sec', desc: 'Standard bilanciato', icon: Volume2 },
                    { sec: 3, label: '3 sec', desc: 'Transizione fluida', icon: Volume2 },
                    { sec: 5, label: '5 sec', desc: 'Crossfade lungo', icon: Volume2 },
                  ].map((item) => {
                    const isSelected = crossfadeSeconds === item.sec;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={`crossfade-btn-${item.sec}`}
                        onClick={() => onSetCrossfadeSeconds && onSetCrossfadeSeconds(item.sec)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-lg border-white/30'
                            : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                        style={{
                          borderColor: isSelected ? palette.primary : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <IconComp
                            className="w-4 h-4"
                            style={{ color: isSelected ? palette.primary : undefined }}
                          />
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{item.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Audio Storage & Library Statistics */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" style={{ color: palette.primary }} />
                    <span className="text-xs font-bold text-white">Statistiche & Archiviazione Audio</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex flex-col items-center justify-center text-center">
                    <HardDrive className="w-4 h-4 text-slate-400 mb-1" style={{ color: palette.primary }} />
                    <span className="text-sm font-extrabold text-white font-mono">
                      {totalStorageFormatted}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Spazio Audio</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex flex-col items-center justify-center text-center">
                    <Users className="w-4 h-4 text-slate-400 mb-1" style={{ color: palette.primary }} />
                    <span className="text-sm font-extrabold text-white font-mono">
                      {artistCount}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Artisti Totali</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex flex-col items-center justify-center text-center">
                    <Music className="w-4 h-4 text-slate-400 mb-1" style={{ color: palette.primary }} />
                    <span className="text-sm font-extrabold text-white font-mono">
                      {trackCount}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Brani Totali</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Import Music Files */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" style={{ color: palette.primary }} />
                    <span className="text-xs font-bold text-white">Importazione Musica Locale</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{trackCount} Brani Caricati</span>
                </div>
                <p className="text-xs text-slate-400">
                  Aggiungi i tuoi file audio FLAC, MP3, WAV o AAC salvati localmente sul tuo dispositivo.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenImportModal();
                  }}
                  className="w-full py-3 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Upload className="w-4 h-4" />
                  Apri Selettore File Audio
                </button>
              </div>

              {/* Section 4: Clear Orphaned Metadata Action */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Database className="w-4 h-4" style={{ color: palette.primary }} />
                    <span className="text-xs font-bold">Pulizia Metadata Orfani</span>
                  </div>
                  <button
                    disabled={isCleaningMetadata}
                    onClick={async () => {
                      if (!onClearOrphanedMetadata) return;
                      setIsCleaningMetadata(true);
                      setMetadataCleanResult(null);
                      try {
                        const res = await onClearOrphanedMetadata();
                        if (res.totalCleaned > 0) {
                          setMetadataCleanResult(
                            `Pulizia completata: rimossi ${res.removedProfilesCount} profili artista e ${res.removedCoversCount} copertine/tag orfani.`
                          );
                        } else {
                          setMetadataCleanResult('Nessun metadata orfano trovato. Il database è perfettamente pulito!');
                        }
                      } catch (e) {
                        setMetadataCleanResult('Errore durante la scansione dei metadata.');
                      } finally {
                        setIsCleaningMetadata(false);
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl text-white flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: palette.primary }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCleaningMetadata ? 'animate-spin' : ''}`} />
                    <span>{isCleaningMetadata ? 'Scansione in corso...' : 'Pulisci Metadata Orfani'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scansiona il database per identificare e rimuovere profili artista, tag o copertine salvate che non sono più associate ad alcun brano presente nella tua libreria.
                </p>

                {metadataCleanResult && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-2.5 text-xs text-slate-200 animate-in fade-in">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: palette.primary }} />
                    <span>{metadataCleanResult}</span>
                  </div>
                )}
              </div>

              {/* Section 5: Clear Library Action */}
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-bold">Gestione Libreria Locale</span>
                  </div>
                  {!confirmClear ? (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-900/40 hover:bg-rose-900/80 rounded-xl border border-rose-500/30 transition-colors"
                    >
                      Svuota Libreria
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-300 animate-pulse">Sei sicuro?</span>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => {
                          onClearLibrary();
                          setConfirmClear(false);
                        }}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md"
                      >
                        Sì, Elimina
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Elimina tutti i file audio importati memorizzati nel browser.
                </p>
              </div>
            </>
          )}

        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
