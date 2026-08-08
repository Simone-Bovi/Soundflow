import React from 'react';
import { ActiveTab, MaterialPalette } from '../types';
import { Music, Sliders, Upload, Search, Sparkles, Settings, Keyboard } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  palette: MaterialPalette;
  onOpenImportModal: () => void;
  onOpenEqualizerModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenShortcutsHelp?: () => void;
  trackCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  palette,
  onOpenImportModal,
  onOpenEqualizerModal,
  onOpenSettingsModal,
  onOpenShortcutsHelp,
  trackCount,
}) => {
  return (
    <header
      className="sticky top-0 z-30 shrink-0 px-3 sm:px-6 lg:px-8 py-3 backdrop-blur-3xl border-b border-white/10 transition-all duration-500 min-w-0"
      style={{
        backgroundColor: palette?.surface ? `${palette.surface}f0` : 'rgba(2, 6, 23, 0.85)',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 min-w-0">
        
        {/* App Title & Soundflow Logo (Clickable to go Home) */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start shrink-0">
          <button
            onClick={() => setActiveTab('library')}
            className="flex items-center gap-3 cursor-pointer group text-left focus:outline-none"
            title="Soundflow Home"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 duration-200"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 4px 12px -2px ${palette.glowColor}`,
              }}
            >
              <Music className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white font-['Outfit'] group-hover:opacity-90 transition-opacity">
                Soundflow
              </h1>
            </div>
          </button>
        </div>

        {/* Material Expressive Action Navigation Tabs & Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300"
            style={{
              backgroundColor: activeTab === 'search' ? palette.primaryContainer : 'rgba(30, 41, 59, 0.4)',
              color: activeTab === 'search' ? palette.onPrimaryContainer : '#94a3b8',
              border: activeTab === 'search' ? `1px solid ${palette.primary}` : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: activeTab === 'search' ? `0 2px 10px -2px ${palette.glowColor}` : 'none',
            }}
          >
            <Search className="w-4 h-4" style={{ color: activeTab === 'search' ? palette.primary : '#94a3b8' }} />
            Cerca
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300"
            style={{
              backgroundColor: activeTab === 'playlists' ? palette.primaryContainer : 'rgba(30, 41, 59, 0.4)',
              color: activeTab === 'playlists' ? palette.onPrimaryContainer : '#94a3b8',
              border: activeTab === 'playlists' ? `1px solid ${palette.primary}` : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: activeTab === 'playlists' ? `0 2px 10px -2px ${palette.glowColor}` : 'none',
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: activeTab === 'playlists' ? palette.primary : '#94a3b8' }} />
            Playlist
          </button>

          <button
            onClick={() => setActiveTab('eq_atmos')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300"
            style={{
              backgroundColor: activeTab === 'eq_atmos' ? palette.primaryContainer : 'rgba(30, 41, 59, 0.4)',
              color: activeTab === 'eq_atmos' ? palette.onPrimaryContainer : '#94a3b8',
              border: activeTab === 'eq_atmos' ? `1px solid ${palette.primary}` : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: activeTab === 'eq_atmos' ? `0 2px 10px -2px ${palette.glowColor}` : 'none',
            }}
          >
            <Sliders className="w-4 h-4" style={{ color: activeTab === 'eq_atmos' ? palette.primary : '#94a3b8' }} />
            EQ & Atmos
          </button>

          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-all duration-300 active:scale-95 hover:brightness-110"
            style={{
              backgroundColor: palette.primary,
              boxShadow: `0 2px 12px -2px ${palette.glowColor}`,
            }}
          >
            <Upload className="w-4 h-4" />
            Importa
          </button>

          {onOpenShortcutsHelp && (
            <button
              onClick={onOpenShortcutsHelp}
              className="p-2 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10 transition-all shadow-sm active:scale-95 shrink-0"
              title="Scorciatoie Tastiera (?)"
            >
              <Keyboard className="w-4 h-4" style={{ color: palette.primary }} />
            </button>
          )}

          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10 transition-all shadow-sm active:scale-95 shrink-0"
            title="Impostazioni"
          >
            <Settings className="w-4 h-4" style={{ color: palette.primary }} />
          </button>
        </div>

      </div>
    </header>
  );
};

