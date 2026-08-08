# 🎵 Soundflow

> **High-Fidelity Music Player with FLAC Lossless support, 3D Dolby Atmos Spatial Audio, 10-Band Graphic Equalizer, and Dynamic Material You Expressive Interface.**

[![React 19](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131.svg?style=flat-square&logo=tauri)](https://tauri.app/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square)](./LICENSE)

---

## 🌟 Key Features

### 🎧 Audiophile Audio Engine & 3D Spatial Audio
* **Lossless & High-Res Audio Support**: Native playback for **FLAC (24-bit / 96.0 kHz)**, **Hi-Res WAV**, MP3, AAC, and OGG audio formats.
* **Dolby Atmos 3D Spatial Audio Simulation**: Web Audio API spatial panner (3D X/Y/Z coordinates), room convolver reverberation, room sizing, and customizable sub-bass boost.
* **10-Band Graphic Equalizer**: Full frequency control (31Hz – 16kHz) with built-in presets (*Bass Boost, Acoustic, Vocal, Electro, Rock, Atmos 3D, Flat*).
* **Real-Time Visualizer**: Animated 64-band frequency spectrum powered by Web Audio API `AnalyserNode`.
* **Crossfade & Smooth Transitions**: Configurable track crossfading and smooth fade-in/fade-out logic.

### 🎨 Material You Expressive & Dynamic Design System
* **Dynamic Color Extraction**: Custom HTML5 Canvas algorithm that extracts color palettes directly from the active album cover art, updating background gradients, ambient glows, and UI accents in real time.
* **Glassmorphism & Micro-Animations**: Modern blurred aesthetic with Framer Motion transitions and Lucide React icons.
* **Full-Screen Immersive Player**: Rich full-screen mode featuring animated spinning vinyl artwork, synchronized **LRC** lyrics, and an "Up Next" queue drawer.

### 📁 Library Management & Offline Storage
* **Local Folder Scanner**: Fast local music file import using Web File API or Tauri native filesystem APIs.
* **Persistent IndexedDB Storage**: Reliable offline persistence for tracks, audio binary blobs, custom artwork, playlists, favorites, and metadata without external backend dependencies.
* **ID3 Tag & Metadata Parsing**: Automatic extraction of artist, album, genre, release year, bitrate, sample rate, and embedded cover art via `jsmediatags`.
* **Smart Playlists**: Auto-generated dynamic playlists including *Favorites*, *FLAC Lossless*, *Dolby Atmos*, and *Recently Added*.
* **Synced LRC Lyrics Engine**: Real-time line-by-line lyric parser and synchronized display.

### 📊 Soundflow Wrapped (Music Wrapped)
* Personalized listening statistics: total listening time, top played tracks, top artists, genre breakdown, and an interactive annual review.

### 🖥️ Cross-Platform (Desktop & Web App)
* **Native Desktop App**: Deep integration with **Tauri v2** for running Soundflow natively on **Windows, macOS, and Linux** with a custom frameless drag-and-drop titlebar.
* **Standalone Web SPA**: High-performance single-page web app built with **Vite 6** and **React 19**.

---

## 📐 Project Architecture

```
Soundflow/
├── src/
│   ├── components/         # UI Components (Player, EQ, Library, Wrapped, Modals)
│   │   ├── EQAtmosView.tsx         # Equalizer & 3D Spatial Audio Controls
│   │   ├── FullScreenPlayer.tsx    # Immersive Player & Synced LRC Lyrics
│   │   ├── LibraryView.tsx         # Music Library & Filtering
│   │   ├── MusicWrappedView.tsx    # Listening Statistics & Wrapped View
│   │   ├── PlaylistView.tsx        # Playlist Management & Smart Playlists
│   │   └── Titlebar.tsx            # Custom Frameless Titlebar for Tauri
│   ├── lib/                # Engine & Core Logic
│   │   ├── audioEngine.ts          # Web Audio API Engine
│   │   ├── colorExtractor.ts       # Album Art Color Palette Extraction
│   │   ├── folderScanner.ts        # File & Metadata Importer
│   │   ├── indexedDb.ts            # IndexedDB Offline Storage Manager
│   │   ├── lrcParser.ts            # Synced .lrc Lyrics Parser
│   │   ├── metadataParser.ts       # ID3 / FLAC Tag Parser
│   │   └── wrappedTracker.ts       # Listening Analytics Tracker
│   ├── App.tsx             # Main Application Entry & Global State
│   ├── types.ts            # TypeScript Definitions (Track, Playlist, EQ, Palette)
│   └── index.css           # Design Tokens & Tailwind CSS v4 Configuration
├── src-tauri/              # Tauri v2 Rust Configuration & Desktop Backend
├── LICENSE                 # GNU General Public License v3.0
├── package.json            # Project Metadata & Dependencies
└── vite.config.ts          # Vite Configuration & Server Options
```

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js** v18+ or **Bun**
* **npm**, **yarn**, or **bun**
* *(Optional for Desktop Build)* **Rust** & Tauri v2 build tools

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/soundflow.git
   cd soundflow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start Development Web Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Run Desktop App in Development Mode** (optional):
   ```bash
   npm run tauri:dev
   ```

5. **Build for Production**:
   * **Web Build**: `npm run build`
   * **Desktop App Build**: `npm run tauri:build`

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `Right Arrow` | Skip forward 5 seconds |
| `Left Arrow` | Rewind 5 seconds |
| `Up Arrow` | Increase volume (+5%) |
| `Down Arrow` | Decrease volume (-5%) |
| `F` | Toggle Full-Screen Mode |
| `M` | Mute / Unmute Audio |

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See the [LICENSE](./LICENSE) file for details.
