import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EqualizerBands, EqualizerPreset, MaterialPalette, Spatial3DPosition, SpatialMode } from '../types';
import { Sliders, Radio, Move, Sparkles, Volume2, Disc, Waves, ShieldCheck } from 'lucide-react';

interface EQAtmosViewProps {
  spatialMode: SpatialMode;
  palette: MaterialPalette;
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
      className="relative w-8 sm:w-9 h-44 sm:h-52 bg-slate-950 rounded-full border border-white/10 flex items-end justify-center cursor-pointer select-none touch-none p-1 transition-all hover:border-white/20"
    >
      {/* Zero dB mark */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20 pointer-events-none" />

      {/* Active Fill Track */}
      <div
        className="w-2.5 rounded-full transition-all duration-75"
        style={{
          height: `${percentage}%`,
          backgroundColor: primaryColor,
          opacity: 0.85,
        }}
      />

      {/* Slider Thumb ("Pallino") */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-7 h-7 rounded-full shadow-2xl border-2 border-white flex items-center justify-center transition-transform active:scale-125 hover:scale-110 pointer-events-none"
        style={{
          bottom: `calc(${percentage}% - 14px)`,
          backgroundColor: primaryColor,
          boxShadow: `0 0 14px ${primaryColor}`,
        }}
      >
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
    </div>
  );
};

export const EQAtmosView: React.FC<EQAtmosViewProps> = ({
  spatialMode,
  palette,
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
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ backgroundColor: palette.primary }} />
        
        <div className="flex items-center gap-4">
          <div
            className="p-4 rounded-2xl text-white shadow-xl shrink-0"
            style={{
              backgroundColor: palette.primary,
              boxShadow: `0 0 24px -2px ${palette.glowColor}`,
            }}
          >
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] flex items-center gap-2">
              EQ & Dolby Atmos <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">Hi-Fi DSP Engine</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Processore audio parametrico a 10 bande con posizionamento spaziale 3D in tempo reale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-3.5 py-2 rounded-2xl border border-white/10 self-stretch md:self-auto justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Lossless 24-bit / 96kHz Processing Active</span>
        </div>
      </div>

      {/* Spatial Audio Modes selector */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: palette.primary }} /> Modalità Spaziale Dolby Atmos
          </h4>
          <span className="text-xs font-mono text-slate-400 uppercase font-bold">{spatialMode.replace('_', ' ')}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'stereo', name: 'Stereo 2.0 Direct', desc: 'Senza alterazioni spaziali' },
            { id: 'dolby_atmos', name: 'Dolby Atmos 7.1.4', desc: 'Canali immersivi 3D' },
            { id: 'cinema_surround', name: 'Cinema Surround', desc: 'Ampia dinamica cinematografica' },
            { id: 'concert_hall', name: 'Concert Hall 3D', desc: 'Acustica da sala da concerto' },
          ].map((mode, idx) => {
            const isSelected = spatialMode === mode.id;
            return (
              <motion.button
                key={`eq-view-mode-${mode.id}-${idx}`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSetSpatialMode(mode.id as SpatialMode)}
                className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between gap-1 ${
                  isSelected
                    ? 'text-white border-transparent shadow-xl'
                    : 'bg-slate-900/70 text-slate-400 border-white/5 hover:bg-slate-900 hover:text-slate-200'
                }`}
                style={{
                  backgroundColor: isSelected ? palette.primary : undefined,
                  boxShadow: isSelected ? `0 6px 20px -4px ${palette.glowColor}` : undefined,
                }}
              >
                <div className="text-xs font-extrabold">{mode.name}</div>
                <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                  {mode.desc}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* EQ Presets Bar */}
      <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: palette.primary }} />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Preset Equalizzatore Grafico
          </h4>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PRESETS.map((p, idx) => (
            <motion.button
              key={`eq-view-preset-${p.id}-${idx}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectPreset(p)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border border-white/10 hover:border-white/20 shadow-md"
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                color: '#f8fafc',
              }}
            >
              {p.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 10 Band Sliders Main Console */}
      <div className="bg-slate-950/90 p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4" style={{ color: palette.primary }} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Console 10 Bande di Frequenza (-12dB a +12dB)</span>
          </div>
          <span className="text-xs font-mono text-slate-400">Trascina i nodi verticali</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 text-center pt-2">
          {bandKeys.map(({ key, label }, idx) => {
            const val = bands[key];
            return (
              <div key={`eq-view-band-${key}-${idx}`} className="flex flex-col items-center gap-3">
                <span className="text-xs font-mono font-black text-white">
                  {val > 0 ? `+${val}` : val}
                  <span className="text-[10px] text-slate-400 ml-0.5">dB</span>
                </span>
                
                <VerticalEQSlider
                  value={val}
                  onChange={(n) => handleBandChange(key, n)}
                  primaryColor={palette.primary}
                />

                <span className="text-[11px] font-mono text-slate-300 font-bold">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Soundstage Panner controls */}
      <div className="bg-slate-950/90 p-6 rounded-[32px] border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
            <Move className="w-4 h-4" style={{ color: palette.primary }} /> Posizionamento Canali Spaziali 3D (Atmos Bed)
          </span>
          <span className="text-xs font-mono text-slate-400">
            CoCoordinate: X={spatialPos.x} | Y={spatialPos.y} | Z={spatialPos.z}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-300 font-bold">Sub-Bass Boost</label>
              <span className="font-mono text-emerald-400 font-bold">{spatialPos.subBassBoost} dB</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={spatialPos.subBassBoost}
              onChange={(e) => handlePosChange('subBassBoost', Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: palette.primary }}
            />
            <p className="text-[10px] text-slate-400">Enfatizza le sub-frequenze basse profonde per subwoofer e cuffie Hi-Fi.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-300 font-bold">Profondità Stanza Riverbero</label>
              <span className="font-mono text-emerald-400 font-bold">{Math.round(spatialPos.roomSize * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={spatialPos.roomSize}
              onChange={(e) => handlePosChange('roomSize', Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: palette.primary }}
            />
            <p className="text-[10px] text-slate-400">Simula la tridimensionalità e le riflessioni dell'ambiente acustico.</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-300 font-bold">Distanza Fonte Spaziale Z</label>
              <span className="font-mono text-emerald-400 font-bold">Z = {spatialPos.z}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={spatialPos.z}
              onChange={(e) => handlePosChange('z', Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: palette.primary }}
            />
            <p className="text-[10px] text-slate-400">Allontana o avvicina il palcoscenico sonoro virtuale rispetto all'ascoltatore.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
