import { EqualizerBands, Spatial3DPosition, SpatialMode } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private freqDataBuffer: Uint8Array | null = null;
  
  // 10 Band EQ nodes
  private eqFilters: BiquadFilterNode[] = [];
  private static readonly FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  // Spatial Panner & Reverb nodes
  private pannerNode: PannerNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private spatialGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private bassBoostFilterNode: BiquadFilterNode | null = null;

  // Synthesizer Fallback Generator for Hi-Fi Demos
  private synthOscillators: OscillatorNode[] = [];
  private synthGainNode: GainNode | null = null;
  private isSynthPlaying = false;
  private synthInterval: number | null = null;

  private spatialMode: SpatialMode = 'stereo';
  private spatialPos: Spatial3DPosition = { x: 0, y: 1.5, z: 3, roomSize: 0.6, subBassBoost: 4 };
  private currentVolume: number = 0.85;

  // Fade In & Out / Crossfade Settings
  private isCrossfadeEnabled: boolean = true;
  private crossfadeDurationSeconds: number = 2;

  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onPlayStateChangeCallback: ((isPlaying: boolean) => void) | null = null;

  constructor() {
    // Audio elements will be initialized on user interaction
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    // Master Gain
    this.masterGainNode = this.ctx.createGain();

    // Analyser
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 128;
    this.analyserNode.smoothingTimeConstant = 0.82;

    // Create 10 EQ filters
    this.eqFilters = AudioEngine.FREQUENCIES.map((freq) => {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });

    // Sub bass filter
    this.bassBoostFilterNode = this.ctx.createBiquadFilter();
    this.bassBoostFilterNode.type = 'lowshelf';
    this.bassBoostFilterNode.frequency.value = 100;
    this.bassBoostFilterNode.gain.value = 0;

    // Spatial 3D Panner
    this.pannerNode = this.ctx.createPanner();
    this.pannerNode.panningModel = 'equalpower';
    this.pannerNode.distanceModel = 'inverse';
    this.pannerNode.refDistance = 1;
    this.pannerNode.maxDistance = 10000;
    this.pannerNode.rolloffFactor = 1;
    this.pannerNode.coneInnerAngle = 360;

    // Reverb / Room Convolver
    this.convolverNode = this.ctx.createConvolver();
    this.createImpulseResponse(1.5, 2.0); // 1.5s reverb room

    this.spatialGainNode = this.ctx.createGain();
    this.spatialGainNode.gain.value = 0; // 0 for default stereo mode

    // Force default spatial mode settings
    this.setSpatialMode('stereo');

    // Setup source pipeline
    this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);

    // Connect node chain:
    // MediaSource -> BassBoost -> EQ0 -> ... -> EQ9 -> Panner -> MasterGain -> Analyser -> Destination
    let lastNode: AudioNode = this.mediaSourceNode;
    lastNode.connect(this.bassBoostFilterNode);
    lastNode = this.bassBoostFilterNode;

    // Connect EQ filters in series
    this.eqFilters.forEach((filter) => {
      lastNode.connect(filter);
      lastNode = filter;
    });

    // Connect spatial nodes
    lastNode.connect(this.pannerNode);
    lastNode.connect(this.convolverNode);
    this.convolverNode.connect(this.spatialGainNode);
    this.spatialGainNode.connect(this.masterGainNode);

    this.pannerNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    // Apply stored volume level
    this.setVolume(this.currentVolume);

    // Audio element event listeners
    const notifyTimeAndDuration = () => {
      if (
        this.audioElement &&
        this.onTimeUpdateCallback &&
        !this.isSynthPlaying
      ) {
        this.onTimeUpdateCallback(
          this.audioElement.currentTime || 0,
          this.audioElement.duration || 0
        );
      }
    };

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement && !this.audioElement.paused) {
        notifyTimeAndDuration();

        // Automatic end-of-track fade out if crossfade is enabled
        if (
          this.isCrossfadeEnabled &&
          this.crossfadeDurationSeconds > 0 &&
          this.audioElement.duration > 4 &&
          this.masterGainNode &&
          this.ctx
        ) {
          const remaining = this.audioElement.duration - this.audioElement.currentTime;
          if (remaining > 0 && remaining <= this.crossfadeDurationSeconds) {
            const now = this.ctx.currentTime;
            this.masterGainNode.gain.cancelScheduledValues(now);
            this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, now);
            this.masterGainNode.gain.linearRampToValueAtTime(0, now + remaining);
          }
        }
      }
    });
    this.audioElement.addEventListener('loadedmetadata', notifyTimeAndDuration);
    this.audioElement.addEventListener('durationchange', notifyTimeAndDuration);

    this.audioElement.addEventListener('ended', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(false);
      }
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    this.audioElement.addEventListener('play', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(true);
      }
    });

    this.audioElement.addEventListener('pause', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(false);
      }
    });

    if ('mediaSession' in navigator) {
      this.audioElement.addEventListener('play', () => {
        navigator.mediaSession.playbackState = 'playing';
      });
      this.audioElement.addEventListener('pause', () => {
        navigator.mediaSession.playbackState = 'paused';
      });
    }

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio element error:', e);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(false);
      }
      this.stopSynth();
    });
  }

  public setCrossfade(enabled: boolean, durationSeconds: number = 2) {
    this.isCrossfadeEnabled = enabled;
    this.crossfadeDurationSeconds = Math.max(0, durationSeconds);
  }

  public getCrossfade() {
    return {
      enabled: this.isCrossfadeEnabled,
      duration: this.crossfadeDurationSeconds,
    };
  }

  public async loadAndPlay(url: string, genre: string = 'Ambient') {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stopSynth();

    // Check if url is synth fallback
    if (url.startsWith('synth://')) {
      this.playSynthSoundscape(genre);
      return;
    }

    if (this.audioElement) {
      const targetVol = Math.pow(this.currentVolume, 1.25);
      if (this.masterGainNode && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGainNode.gain.cancelScheduledValues(now);
        this.masterGainNode.gain.setValueAtTime(targetVol, now);
      }

      this.audioElement.src = url;
      try {
        await this.audioElement.play();
      } catch (err) {
        console.warn('Playback error for URL:', url, err);
      }
    }
  }

  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.isSynthPlaying) {
      this.pauseSynth();
    }
    if (this.masterGainNode && this.ctx) {
      const targetVol = Math.pow(this.currentVolume, 1.25);
      const now = this.ctx.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setValueAtTime(targetVol, now);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isSynthPlaying) {
      this.resumeSynth();
      return;
    }
    if (this.audioElement && this.audioElement.src) {
      const targetVol = Math.pow(this.currentVolume, 1.25);
      if (this.masterGainNode && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGainNode.gain.cancelScheduledValues(now);
        this.masterGainNode.gain.setValueAtTime(targetVol, now);
      }
      this.audioElement.play().catch((err) => {
        console.warn('Resume playback error:', err);
      });
    }
  }

  public seek(seconds: number) {
    if (this.audioElement && !this.isSynthPlaying && this.audioElement.duration) {
      this.audioElement.currentTime = seconds;
    }
  }

  public setVolume(volume: number) { // 0 to 1
    this.currentVolume = Math.max(0, Math.min(1, volume));
    const scaled = Math.pow(this.currentVolume, 1.25);
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGainNode.gain.setValueAtTime(scaled, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.volume = scaled;
    }
  }

  public setEqualizer(bands: EqualizerBands) {
    const values = [
      bands.b31, bands.b62, bands.b125, bands.b250, bands.b500,
      bands.b1k, bands.b2k, bands.b4k, bands.b8k, bands.b16k,
    ];

    values.forEach((val, idx) => {
      if (this.eqFilters[idx]) {
        this.eqFilters[idx].gain.setTargetAtTime(val, this.ctx?.currentTime || 0, 0.05);
      }
    });
  }

  public setSpatialMode(mode: SpatialMode) {
    this.spatialMode = mode;
    if (!this.pannerNode || !this.spatialGainNode) return;

    const now = this.ctx?.currentTime || 0;

    switch (mode) {
      case 'stereo':
        this.pannerNode.panningModel = 'equalpower';
        this.pannerNode.setPosition(0, 0, 0);
        this.spatialGainNode.gain.setTargetAtTime(0, now, 0.1);
        if (this.bassBoostFilterNode) {
          this.bassBoostFilterNode.gain.setTargetAtTime(0, now, 0.1);
        }
        break;
      case 'dolby_atmos':
        this.pannerNode.panningModel = 'HRTF';
        this.update3DPosition(this.spatialPos);
        this.spatialGainNode.gain.setTargetAtTime(0.35, now, 0.1);
        break;
      case 'cinema_surround':
        this.pannerNode.panningModel = 'HRTF';
        this.pannerNode.setPosition(0, 2, 4);
        this.spatialGainNode.gain.setTargetAtTime(0.55, now, 0.1);
        break;
      case 'concert_hall':
        this.pannerNode.panningModel = 'HRTF';
        this.pannerNode.setPosition(0, 3, 6);
        this.spatialGainNode.gain.setTargetAtTime(0.75, now, 0.1);
        break;
      case 'head_tracking':
        this.pannerNode.panningModel = 'HRTF';
        this.spatialGainNode.gain.setTargetAtTime(0.4, now, 0.1);
        break;
    }
  }

  public update3DPosition(pos: Spatial3DPosition) {
    this.spatialPos = pos;
    if (this.pannerNode && this.ctx) {
      this.pannerNode.setPosition(pos.x, pos.y, pos.z);
    }
    if (this.bassBoostFilterNode && this.ctx) {
      this.bassBoostFilterNode.gain.setTargetAtTime(pos.subBassBoost, this.ctx.currentTime, 0.1);
    }
  }

  public getByteFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(64);
    if (!this.freqDataBuffer || this.freqDataBuffer.length !== this.analyserNode.frequencyBinCount) {
      this.freqDataBuffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    }
    this.analyserNode.getByteFrequencyData(this.freqDataBuffer);
    return this.freqDataBuffer;
  }

  public setTimeUpdateListener(cb: (time: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public setEndedListener(cb: () => void) {
    this.onEndedCallback = cb;
  }

  public setPlayStateListener(cb: (isPlaying: boolean) => void) {
    this.onPlayStateChangeCallback = cb;
  }

  // Generates impulse response for realistic spatial room acoustics
  private createImpulseResponse(duration: number, decay: number) {
    if (!this.ctx || !this.convolverNode) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    }

    this.convolverNode.buffer = impulse;
  }

  // --- Generative Synth Soundscape Fallback ---
  private synthTime = 0;
  private synthDuration = 240; // 4 minutes
  private isSynthPaused = false;

  private playSynthSoundscape(genre: string = 'Ambient') {
    this.init();
    this.stopSynth();
    if (!this.ctx || !this.masterGainNode) return;

    this.isSynthPlaying = true;
    this.isSynthPaused = false;
    this.synthTime = 0;
    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(true);
    }

    this.synthGainNode = this.ctx.createGain();
    this.synthGainNode.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // Connect synth directly into EQ filter chain
    this.synthGainNode.connect(this.bassBoostFilterNode!);

    // Chord root frequencies based on genre
    const baseFreqs = genre.includes('Synthwave')
      ? [110, 164.81, 220, 329.63, 440] // A Minor / Cyberpunk
      : genre.includes('Jazz')
      ? [146.83, 185, 220, 277.18, 329.63] // D Maj7
      : genre.includes('Classical')
      ? [130.81, 164.81, 196, 246.94, 261.63] // C Maj9
      : [110, 146.83, 164.81, 220, 293.66]; // Ambient Spatial D Deep

    this.synthOscillators = baseFreqs.map((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const panGain = this.ctx!.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      // Subtle frequency modulation
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      lfo.frequency.value = 0.2 + i * 0.1;
      lfoGain.gain.value = 3 + i;
      lfo.connect(osc.frequency);
      lfo.start();

      osc.connect(panGain);
      panGain.connect(this.synthGainNode!);
      osc.start();
      return osc;
    });

    // Timer loop for time update
    if (this.synthInterval) clearInterval(this.synthInterval);
    this.synthInterval = window.setInterval(() => {
      if (this.isSynthPlaying && !this.isSynthPaused) {
        this.synthTime += 0.5;
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.synthTime, this.synthDuration);
        }
        if (this.synthTime >= this.synthDuration && this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    }, 500);
  }

  private pauseSynth() {
    this.isSynthPaused = true;
    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(false);
    }
    if (this.synthGainNode && this.ctx) {
      this.synthGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  private resumeSynth() {
    this.isSynthPaused = false;
    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(true);
    }
    if (this.synthGainNode && this.ctx) {
      this.synthGainNode.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.1);
    }
  }

  private stopSynth() {
    this.isSynthPlaying = false;
    this.isSynthPaused = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.synthOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore if already stopped
      }
    });
    this.synthOscillators = [];
  }
}

export const audioEngine = new AudioEngine();
