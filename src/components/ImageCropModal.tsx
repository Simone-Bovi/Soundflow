import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialPalette, TransitionSpeed } from '../types';
import { X, ZoomIn, ZoomOut, Move, RotateCcw, Check, Disc, User, Crop } from 'lucide-react';
import { getAnimDuration } from '../lib/animUtils';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
  initialShape?: 'square' | 'circle';
  palette: MaterialPalette;
  transitionSpeed?: TransitionSpeed;
  initialZoom?: number;
  initialOffsetX?: number;
  initialOffsetY?: number;
  onConfirm: (
    croppedDataUrl: string,
    originalImageSrc: string,
    cropParams: { zoom: number; offsetX: number; offsetY: number }
  ) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  title = 'Regola & Centra Copertina',
  initialShape = 'square',
  palette,
  transitionSpeed,
  initialZoom = 1,
  initialOffsetX = 0,
  initialOffsetY = 0,
  onConfirm,
}) => {
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: initialOffsetX, y: initialOffsetY });
  const [shape, setShape] = useState<'square' | 'circle'>(initialShape);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const duration = getAnimDuration(transitionSpeed);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset or restore adjustments when imageSrc or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setZoom(initialZoom || 1);
      setOffset({ x: initialOffsetX || 0, y: initialOffsetY || 0 });
      setShape(initialShape);
    }
  }, [isOpen, imageSrc, initialShape, initialZoom, initialOffsetX, initialOffsetY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffset.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setOffset({
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleAlign = (position: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
    if (position === 'center') {
      setOffset({ x: 0, y: 0 });
    } else if (position === 'top') {
      setOffset((prev) => ({ ...prev, y: 60 }));
    } else if (position === 'bottom') {
      setOffset((prev) => ({ ...prev, y: -60 }));
    } else if (position === 'left') {
      setOffset((prev) => ({ ...prev, x: 60 }));
    } else if (position === 'right') {
      setOffset((prev) => ({ ...prev, x: -60 }));
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const size = 600; // Output high resolution 600x600 square
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);

      // Background fill
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);

      // Compute image scaling to cover canvas
      const imgAspect = img.width / img.height;
      let drawW = size;
      let drawH = size;

      if (imgAspect > 1) {
        drawW = size * imgAspect;
      } else {
        drawH = size / imgAspect;
      }

      // Apply zoom & translation relative to container ratio (300px container to 600px canvas = factor 2)
      const scaleFactor = 2; // size (600) / containerSize (300)
      const finalZoomW = drawW * zoom;
      const finalZoomH = drawH * zoom;

      // Centered position + scaled offset
      const posX = (size - finalZoomW) / 2 + offset.x * scaleFactor;
      const posY = (size - finalZoomH) / 2 + offset.y * scaleFactor;

      ctx.drawImage(img, posX, posY, finalZoomW, finalZoomH);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onConfirm(dataUrl, imageSrc, { zoom, offsetX: offset.x, offsetY: offset.y });
      onClose();
    };
    img.src = imageSrc;
  };

  return (
    <AnimatePresence>
      {isOpen && imageSrc && (
        <motion.div
          key="image-crop-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            key="image-crop-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-[32px] overflow-hidden shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl text-white shadow-lg"
              style={{ backgroundColor: palette.primary }}
            >
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white font-['Outfit']">
                {title}
              </h3>
              <p className="text-xs text-slate-400">Sposta e ridimensiona la foto nel riquadro</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shape Switcher (Album Square vs Artist Circle) */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setShape('square')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${
              shape === 'square'
                ? 'bg-slate-800 text-white border-white/30 shadow-md'
                : 'bg-slate-950 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" style={{ color: shape === 'square' ? palette.primary : undefined }} />
            <span>Quadrato (Album)</span>
          </button>

          <button
            type="button"
            onClick={() => setShape('circle')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${
              shape === 'circle'
                ? 'bg-slate-800 text-white border-white/30 shadow-md'
                : 'bg-slate-950 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" style={{ color: shape === 'circle' ? palette.primary : undefined }} />
            <span>Cerchio (Artista)</span>
          </button>
        </div>

        {/* Interactive Viewport Area (300x300 px) */}
        <div className="flex justify-center my-2">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative w-[280px] h-[280px] bg-slate-950 border-2 border-dashed border-white/20 overflow-hidden cursor-grab active:cursor-grabbing shadow-2xl select-none group transition-all ${
              shape === 'circle' ? 'rounded-full' : 'rounded-3xl'
            }`}
          >
            {/* Display Image with CSS transform */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              className="absolute max-w-none w-full h-full object-cover transition-transform duration-75 pointer-events-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />

            {/* Grid overlay lines (Rule of Thirds) on drag/hover */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30 group-hover:opacity-60 transition-opacity">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div className="" />
            </div>

            {/* Pan Hint Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity text-white/80 text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
              <Move className="w-4 h-4 animate-pulse" />
              <span>Trascina per centrare</span>
            </div>
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5" style={{ color: palette.primary }} />
              <span>Ingrandimento / Zoom:</span>
            </span>
            <span className="font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.15).toFixed(2)))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Position Alignment Buttons & Reset */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Allineamento:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleAlign('center')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] transition-colors"
            >
              Centro
            </button>
            <button
              type="button"
              onClick={() => handleAlign('top')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] transition-colors"
            >
              Alto
            </button>
            <button
              type="button"
              onClick={() => handleAlign('bottom')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] transition-colors"
            >
              Basso
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors ml-1"
              title="Ripristina posizionamento"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white flex items-center gap-2 shadow-xl transition-all active:scale-95"
            style={{
              backgroundColor: palette.primary,
              boxShadow: `0 4px 16px -3px ${palette.glowColor}`,
            }}
          >
            <Check className="w-4 h-4" />
            <span>Applica e Salva Copertina</span>
          </button>
        </div>

        {/* Hidden Canvas for rendering output image */}
        <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
