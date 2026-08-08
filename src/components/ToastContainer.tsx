import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, CheckCircle2, Info, RotateCcw, X } from 'lucide-react';
import { MaterialPalette } from '../types';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'delete' | 'success' | 'info';
  action?: ToastAction;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onCloseToast: (id: string) => void;
  palette: MaterialPalette;
}

const SingleToast: React.FC<{
  toast: ToastMessage;
  onClose: (id: string) => void;
  palette: MaterialPalette;
}> = ({ toast, onClose, palette }) => {
  const duration = toast.duration || 7000;
  const [isStarted, setIsStarted] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsStarted(true);
    });

    const timer = setTimeout(() => {
      onCloseRef.current(toast.id);
    }, duration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [toast.id, duration]);

  const handleAction = () => {
    if (toast.action) {
      toast.action.onClick();
    }
    onClose(toast.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="relative overflow-hidden flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 text-slate-100 shadow-2xl min-w-[280px] max-w-md w-full"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-xl bg-slate-800/80 shrink-0 border border-white/5">
          {toast.type === 'delete' ? (
            <Trash2 className="w-4 h-4 text-rose-400" />
          ) : toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Info className="w-4 h-4 text-sky-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate font-['Outfit']">
            {toast.title}
          </p>
          {toast.description && (
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {toast.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {toast.action && (
          <button
            onClick={handleAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-white/10 shadow-sm"
            style={{ borderColor: `${palette.primary}40` }}
          >
            <RotateCcw className="w-3.5 h-3.5" style={{ color: palette.primary }} />
            <span>{toast.action.label}</span>
          </button>
        )}
        <button
          onClick={() => onClose(toast.id)}
          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800/50 overflow-hidden">
        <div
          className="h-full"
          style={{
            width: isStarted ? '0%' : '100%',
            transition: isStarted ? `width ${duration}ms linear` : 'none',
            backgroundColor: toast.type === 'delete' ? '#f43f5e' : palette.primary,
          }}
        />
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onCloseToast,
  palette,
}) => {
  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <SingleToast
              toast={toast}
              onClose={onCloseToast}
              palette={palette}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
