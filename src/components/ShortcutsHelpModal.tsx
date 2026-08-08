import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Play, SkipForward, SkipBack, Volume2, VolumeX, Heart, Shuffle, Repeat, Maximize2, Sparkles } from 'lucide-react';
import { MaterialPalette, TransitionSpeed } from '../types';
import { getAnimDuration } from '../lib/animUtils';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  palette?: MaterialPalette;
  transitionSpeed?: TransitionSpeed;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  palette,
  transitionSpeed,
}) => {
  const primaryColor = palette?.primary || '#a855f7';
  const duration = getAnimDuration(transitionSpeed);

  const shortcutGroups = [
    {
      title: 'Controlli Riproduzione Globali',
      items: [
        {
          keys: ['Spazio', 'K'],
          mediaKey: 'Play / Pause',
          description: 'Avvia o Mette in Pausa la riproduzione',
          icon: Play,
        },
        {
          keys: ['→', 'Shift + →'],
          mediaKey: 'Next Track',
          description: 'Avanza di 5 secondi (o passa al brano successivo con Shift)',
          icon: SkipForward,
        },
        {
          keys: ['←', 'Shift + ←'],
          mediaKey: 'Prev Track',
          description: 'Riavvolgi di 5 secondi (o torna al brano precedente con Shift)',
          icon: SkipBack,
        },
      ],
    },
    {
      title: 'Volume e Audio',
      items: [
        {
          keys: ['↑'],
          mediaKey: 'Volume Up',
          description: 'Aumenta il volume (+5%)',
          icon: Volume2,
        },
        {
          keys: ['↓'],
          mediaKey: 'Volume Down',
          description: 'Riduci il volume (-5%)',
          icon: Volume2,
        },
        {
          keys: ['M'],
          mediaKey: 'Mute / Unmute',
          description: 'Attiva o disattiva il silenziatore audio',
          icon: VolumeX,
        },
      ],
    },
    {
      title: 'Modalità e Player Interattivo',
      items: [
        {
          keys: ['L'],
          description: 'Aggiungi / Rimuovi dai Preferiti',
          icon: Heart,
        },
        {
          keys: ['S'],
          description: 'Attiva / Disattiva Riproduzione Casuale (Shuffle)',
          icon: Shuffle,
        },
        {
          keys: ['R'],
          description: 'Attiva / Disattiva Ripetizione Brano (Repeat)',
          icon: Repeat,
        },
        {
          keys: ['F'],
          description: 'Apri / Chiudi Player a Schermo Intero',
          icon: Maximize2,
        },
        {
          keys: ['?'],
          description: 'Mostra questa schermata di aiuto scorciatoie',
          icon: Keyboard,
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="shortcuts-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden"
          onClick={onClose}
        >
          <motion.div
            key="shortcuts-modal-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-[32px] overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Scorciatoie da Tastiera Globali
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400">
                    Funzionano con i tasti multimediali anche in background o non a fuoco
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shortcut Groups */}
            <div className="space-y-6">
              {shortcutGroups.map((group, gIdx) => (
                <div key={`group-${gIdx}`} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1">
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {group.items.map((item, iIdx) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={`item-${gIdx}-${iIdx}`}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-950 text-slate-300 shrink-0"
                            >
                              <ItemIcon className="w-4 h-4" style={{ color: primaryColor }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">
                                {item.description}
                              </p>
                              {item.mediaKey && (
                                <p className="text-[10px] text-slate-400">
                                  Supporta tasto fisico: <span className="text-slate-300 font-mono">{item.mediaKey}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Keys Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.keys.map((k, kIdx) => (
                              <kbd
                                key={`k-${kIdx}`}
                                className="px-2.5 py-1 text-[11px] font-mono font-bold text-slate-200 bg-slate-950 border border-white/15 rounded-lg shadow-inner min-w-[28px] text-center"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Premi <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-950 border border-white/10 rounded">ESC</kbd> o clicca fuori per chiudere</span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                Capito
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
