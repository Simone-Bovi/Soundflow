import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EqualizerBands, EqualizerPreset, MaterialPalette, Spatial3DPosition, SpatialMode, TransitionSpeed } from '../types';
import { Sliders, Radio, X, Volume2, Sparkles, Move } from 'lucide-react';
import { getAnimDuration } from '../lib/animUtils';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spatialMode: SpatialMode;
  palette: MaterialPalette;
  transitionSpeed?: TransitionSpeed;
  onSetSpatialMode: (mode: SpatialMode) => void;
  onSetEqualizerBands: (bands: EqualizerBands) => void;
  onUpdate3DPos: (pos: Spatial3DPosition) => void;
}

const PRESETS: EqualizerPreset[] = [
  {
    id: 'flat',
    name: 'Flat / Originale',
    bands: { b31: 0, b62: 0, b125: 0, b250: 0, b500: 0, b1k: 0, b2k: 0, b4k: 0, b8k: 0, b16k: 0 },
  },
  {
    id: 'flac_clarity',
    name: 'Hi-Fi Lossless Clarity',
    bands: { b31: 2, b62: 3, b125: 1, b250: 0, b500: 1, b1k: 2, b2k: 3, b4k: 4, b8k: 5, b16k: 6 },
  },
  {
    id: 'bass_boost',
    name: 'Bass Boost Deep',
    bands: { b31: 8, b62: 7, b125: 5, b250: 3, b500: 0, b1k: -1, b2k: 0, b4k: 2, b8k: 3, b16k: 4 },
  },
  {
    id: 'cinema',
    name: 'Cinema Surround 3D',
    bands: { b31: 5, b62: 4, b125: 2, b250: -1, b500: 1, b1k: 3, b2k: 4, b4k: 5, b8k: 6, b16k: 5 },
  },
  {
    id: 'vocals',
    name: 'Voci & Trasparenza',
    bands: { b31: -2, b62: -1, b125: 1, b250: 3, b500: 4, b1k: 5, b2k: 4, b4k: 2, b8k: 1, b16k: 0 },
  },
];

// Custom smooth vertical slider for EQ band dragging
const VerticalEQSlider: React.FC<{
  value: number; // -12 to +12
  onChange: (val: number) => void;
  primaryColor: string;
}> = ({ value, onChange, primaryColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateVal = (clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const height = rect.height;
    const offsetY = clientY - rect.top;
    const ratio = 1 - Math.max(0, Math.min(1, offsetY / height));
    const val = Math.round(ratio * 24 - 12);
    onChange(val);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateVal(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      calculateVal(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const percentage = Math.max(0, Math.min(100, ((value + 12) / 24) * 100));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-7 h-40 bg-slate-950 rounded-full border border-white/10 flex items-end justify-center cursor-pointer select-none touch-none p-1 transition-all hover:border-white/20"
    >
      {/* Zero dB mark */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20 pointer-events-none" />

      {/* Active Fill Track */}
      <div
        className="w-2 rounded-full transition-all duration-75"
        style={{
          height: `${percentage}%`,
          backgroundColor: primaryColor,
          opacity: 0.85,
        }}
      />

      {/* Slider Thumb ("Pallino") */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full shadow-2xl border-2 border-white flex items-center justify-center transition-transform active:scale-125 hover:scale-110 pointer-events-none"
        style={{
          bottom: `calc(${percentage}% - 12px)`,
          backgroundColor: primaryColor,
          boxShadow: `0 0 12px ${primaryColor}`,
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </div>
    </div>
  );
};

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  spatialMode,
  palette,
  transitionSpeed,
  onSetSpatialMode,
  onSetEqualizerBands,
  onUpdate3DPos,
}) => {
  const [bands, setBands] = useState<EqualizerBands>(PRESETS[1].bands);
  const [spatialPos, setSpatialPos] = useState<Spatial3DPosition>({
    x: 0,
    y: 1.5,
    z: 3,
    roomSize: 0.6,
    subBassBoost: 4,
  });

  const duration = getAnimDuration(transitionSpeed);

  const handleBandChange = (key: keyof EqualizerBands, val: number) => {
    const updated = { ...bands, [key]: val };
    setBands(updated);
    onSetEqualizerBands(updated);
  };

  const handleSelectPreset = (preset: EqualizerPreset) => {
    setBands(preset.bands);
    onSetEqualizerBands(preset.bands);
  };

  const handlePosChange = (key: keyof Spatial3DPosition, val: number) => {
    const updated = { ...spatialPos, [key]: val };
    setSpatialPos(updated);
    onUpdate3DPos(updated);
  };

  const bandKeys: { key: keyof EqualizerBands; label: string }[] = [
    { key: 'b31', label: '31 Hz' },
    { key: 'b62', label: '62 Hz' },
    { key: 'b125', label: '125 Hz' },
    { key: 'b250', label: '250 Hz' },
    { key: 'b500', label: '500 Hz' },
    { key: 'b1k', label: '1 kHz' },
    { key: 'b2k', label: '2 kHz' },
    { key: 'b4k', label: '4 kHz' },
    { key: 'b8k', label: '8 kHz' },
    { key: 'b16k', label: '16 kHz' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="eq-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            key="eq-modal-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[32px] p-6 lg:p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
        
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl text-white shadow-md"
              style={{ backgroundColor: palette.primary }}
            >
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white font-['Outfit']">
                Equalizzatore Grafico 10 Bande
              </h3>
              <p className="text-xs text-slate-400">
                Processore audio Hi-Fi per FLAC e Dolby Atmos
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

        {/* Spatial Audio Modes selector */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: palette.primary }} /> Modalità Audio Spaziale Dolby Atmos
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'stereo', name: 'Stereo 2.0 Direct' },
              { id: 'dolby_atmos', name: 'Dolby Atmos 7.1.4' },
              { id: 'cinema_surround', name: 'Cinema Surround' },
              { id: 'concert_hall', name: 'Concert Hall 3D' },
            ].map((mode, idx) => (
              <button
                key={`eq-modal-mode-${mode.id}-${idx}`}
                onClick={() => onSetSpatialMode(mode.id as SpatialMode)}
                className={`p-3.5 rounded-2xl text-xs font-bold text-left border transition-all ${
                  spatialMode === mode.id
                    ? 'text-white border-transparent shadow-lg'
                    : 'bg-slate-950/60 text-slate-400 border-white/5 hover:bg-slate-800'
                }`}
                style={{
                  backgroundColor: spatialMode === mode.id ? palette.primary : undefined,
                  boxShadow: spatialMode === mode.id ? `0 4px 18px -4px ${palette.glowColor}` : undefined,
                }}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>

        {/* EQ Presets */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Preset Equalizzatore
          </h4>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRESETS.map((p, idx) => (
              <button
                key={`eq-modal-preset-${p.id}-${idx}`}
                onClick={() => handleSelectPreset(p)}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border border-white/5"
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  color: '#f8fafc',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 10 Band Sliders */}
        <div className="bg-slate-950/80 p-5 rounded-[28px] border border-white/10">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center">
            {bandKeys.map(({ key, label }, idx) => {
              const val = bands[key];
              return (
                <div key={`eq-modal-band-${key}-${idx}`} className="flex flex-col items-center gap-3">
                  <span className="text-[11px] font-mono font-bold text-slate-300">
                    {val > 0 ? `+${val}` : val} dB
                  </span>
                  
                  <VerticalEQSlider
                    value={val}
                    onChange={(n) => handleBandChange(key, n)}
                    primaryColor={palette.primary}
                  />

                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3D Soundstage Panner controls */}
        <div className="bg-slate-950/80 p-5 rounded-[28px] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Move className="w-4 h-4" style={{ color: palette.primary }} /> Posizionamento Canali Spaziali 3D (Atmos Bed)
            </span>
            <span className="text-xs font-mono text-slate-400">
              Posizione X: {spatialPos.x} | Y: {spatialPos.y} | Z: {spatialPos.z}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Sub-Bass Boost ({spatialPos.subBassBoost} dB)
              </label>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={spatialPos.subBassBoost}
                onChange={(e) => handlePosChange('subBassBoost', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: palette.primary }}
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Profondità Stanza Riverbero ({Math.round(spatialPos.roomSize * 100)}%)
              </label>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={spatialPos.roomSize}
                onChange={(e) => handlePosChange('roomSize', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: palette.primary }}
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Distanza Fonte 3D (Z={spatialPos.z})
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={spatialPos.z}
                onChange={(e) => handlePosChange('z', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: palette.primary }}
              />
            </div>
          </div>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

