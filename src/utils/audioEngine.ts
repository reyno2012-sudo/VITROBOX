import { AudioAnalysis, Track } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Synthesizer nodes for zero-404 procedural playback
  private synthInterval: number | null = null;
  private isSynthesizing = false;
  private synthStep = 0;
  private synthBpm = 96;

  private isPlaying = false;
  private currentTime = 0;
  private duration = 180;
  private volume = 0.5;
  private animationFrameId: number | null = null;
  private lastUpdateTime = 0;

  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public playBassPulse() {
    this.initContext();
    if (!this.ctx || !this.analyser) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(140, now);
    oscillator.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    envelope.gain.setValueAtTime(0.3, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    oscillator.connect(envelope);
    envelope.connect(this.analyser);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + 0.52);
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration: number) => void,
    onStateChange: (isPlaying: boolean) => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onStateChangeCallback = onStateChange;
  }

  public loadTrack(track: Track, autoPlay = true) {
    this.stop();
    this.duration = track.duration || 180;
    this.currentTime = 0;

    if (track.audioUrl) {
      this.isSynthesizing = false;
      this.loadUrlAudio(track.audioUrl, autoPlay);
    } else {
      this.isSynthesizing = true;
      if (track.synthPreset === 'unstoppable') this.synthBpm = 92;
      else if (track.synthPreset === 'sunny_day') this.synthBpm = 86;
      else if (track.synthPreset === 'synthwave') this.synthBpm = 118;
      else if (track.synthPreset === 'bossa_jazz') this.synthBpm = 104;
      else this.synthBpm = 80;

      if (autoPlay) {
        this.play();
      }
    }
  }

  private loadUrlAudio(url: string, autoPlay: boolean) {
    // Preload media without creating/resuming Web Audio before a user gesture.
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';

      this.audioElement.addEventListener('loadedmetadata', () => {
        if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
          this.duration = this.audioElement.duration;
          this.onTimeUpdateCallback?.(this.currentTime, this.duration);
        }
      });

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement && !this.isSynthesizing) {
          this.currentTime = this.audioElement.currentTime;
          if (this.audioElement.duration && !isNaN(this.audioElement.duration)) {
            this.duration = this.audioElement.duration;
          }
          this.onTimeUpdateCallback?.(this.currentTime, this.duration);
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.pause();
        this.currentTime = 0;
        this.onTimeUpdateCallback?.(0, this.duration);
      });
    }

    // File previews load the bundled media directly from disk.
    const isLocalPreviewMedia = window.location.protocol === 'file:' && !/^https?:/i.test(url);
    this.audioElement.crossOrigin = isLocalPreviewMedia ? null : 'anonymous';
    this.audioElement.src = url;
    this.audioElement.volume = this.volume;

    if (autoPlay) {
      this.play();
    }
  }

  public play() {
    this.initContext();
    if (this.audioElement && this.ctx && this.analyser && !this.mediaSource) {
      this.mediaSource = this.ctx.createMediaElementSource(this.audioElement);
      this.mediaSource.connect(this.analyser);
    }
    this.isPlaying = true;
    this.onStateChangeCallback?.(true);
    this.lastUpdateTime = performance.now();

    if (this.isSynthesizing) {
      this.startSynthesizer();
      this.startTimerLoop();
    } else if (this.audioElement) {
      this.audioElement.play().catch(() => {
        this.isSynthesizing = true;
        this.startSynthesizer();
        this.startTimerLoop();
      });
      this.startTimerLoop();
    }
  }

  public pause() {
    this.isPlaying = false;
    this.onStateChangeCallback?.(false);

    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.synthInterval) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public stop() {
    this.pause();
    this.currentTime = 0;
    this.onTimeUpdateCallback?.(0, this.duration);
  }

  public seek(seconds: number) {
    this.currentTime = Math.max(0, Math.min(this.duration, seconds));
    if (this.audioElement && !this.isSynthesizing) {
      this.audioElement.currentTime = this.currentTime;
    }
    this.onTimeUpdateCallback?.(this.currentTime, this.duration);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  private startTimerLoop() {
    const loop = () => {
      if (!this.isPlaying) return;
      const now = performance.now();
      const delta = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;

      if (this.isSynthesizing) {
        this.currentTime += delta;
        if (this.currentTime >= this.duration) {
          this.currentTime = 0;
        }
        this.onTimeUpdateCallback?.(this.currentTime, this.duration);
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private startSynthesizer() {
    if (this.synthInterval) {
      window.clearInterval(this.synthInterval);
    }

    const stepDurationMs = (60 / this.synthBpm / 4) * 1000;
    this.synthStep = Math.floor(this.currentTime / (60 / this.synthBpm / 4)) % 64;

    this.synthInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.analyser) return;

      const t = this.ctx.currentTime;
      const barStep = this.synthStep % 16;
      const chordIndex = Math.floor((this.synthStep % 64) / 16);

      if (barStep === 0 || barStep === 8 || barStep === 10) {
        this.triggerKick(t);
      }

      if (barStep === 4 || barStep === 12) {
        this.triggerSnare(t);
      }

      if (barStep % 2 === 0) {
        this.triggerHiHat(t, barStep % 4 === 2 ? 0.35 : 0.2);
      }

      if (barStep === 0 || barStep === 6 || barStep === 10) {
        const rootNotes = [55, 48.99, 65.41, 43.65];
        const root = rootNotes[chordIndex % rootNotes.length];
        this.triggerBass(t, root);
        this.triggerMelody(t, root * 4, barStep);
      }

      this.synthStep = (this.synthStep + 1) % 64;
    }, stepDurationMs);
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.analyser) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);

    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private triggerSnare(time: number) {
    if (!this.ctx || !this.analyser) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.18);
  }

  private triggerHiHat(time: number, vol: number) {
    if (!this.ctx || !this.analyser) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(9500, time);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    gain.gain.setValueAtTime(vol * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private triggerBass(time: number, freq: number) {
    if (!this.ctx || !this.analyser) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + 0.35);

    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 0.46);
  }

  private triggerMelody(time: number, freq: number, step: number) {
    if (!this.ctx || !this.analyser) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const noteScale = [1, 1.2, 1.33, 1.5, 1.66, 1.88];
    const targetFreq = freq * (noteScale[step % noteScale.length] || 1);
    osc.frequency.setValueAtTime(targetFreq, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  private externalPlaybackActive = false;
  private externalBpm = 120;

  public setExternalPlayback(active: boolean, bpm = 120) {
    this.externalPlaybackActive = active;
    this.externalBpm = bpm;
  }

  public getAnalysis(): AudioAnalysis {
    const defaultData = new Uint8Array(128);

    if (this.externalPlaybackActive) {
      const now = performance.now() / 1000;
      const beatFreq = this.externalBpm / 60;
      const beatPhase = (now * beatFreq) % 1;

      // Kick drum curve on downbeat
      const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.5), 2);
      // Snare on 2 and 4
      const snarePhase = ((now * beatFreq + 0.5) % 1);
      const snare = Math.pow(Math.max(0, 1 - snarePhase * 4), 2) * 0.7;
      // High-hat swing
      const hihat = Math.sin(now * beatFreq * 8 * Math.PI) * 0.2 + 0.4;

      const bass = Math.min(1, 0.2 + kick * 0.75 + Math.sin(now * 3) * 0.1);
      const mid = Math.min(1, 0.25 + snare * 0.55 + Math.cos(now * 5) * 0.1);
      const treble = Math.min(1, 0.3 + hihat * 0.4 + Math.sin(now * 11) * 0.15);
      const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

      const freqData = new Uint8Array(128);
      for (let i = 0; i < 128; i++) {
        if (i < 10) {
          freqData[i] = Math.min(255, Math.floor(bass * 255 * (1 - i / 12)));
        } else if (i < 40) {
          freqData[i] = Math.min(255, Math.floor(mid * 220 * (1 - (i - 10) / 35)));
        } else {
          freqData[i] = Math.min(255, Math.floor(treble * 190 * (1 - (i - 40) / 90)));
        }
      }

      return {
        bass,
        mid,
        treble,
        energy,
        frequencyData: freqData,
      };
    }

    if (!this.analyser || !this.isPlaying) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        energy: 0,
        frequencyData: defaultData,
      };
    }

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqData);

    let bassSum = 0;
    for (let i = 1; i <= 8; i++) {
      bassSum += freqData[i] || 0;
    }
    const bass = bassSum / (8 * 255);

    let midSum = 0;
    for (let i = 9; i <= 32; i++) {
      midSum += freqData[i] || 0;
    }
    const mid = midSum / (24 * 255);

    let trebleSum = 0;
    for (let i = 33; i <= 80; i++) {
      trebleSum += freqData[i] || 0;
    }
    const treble = trebleSum / (48 * 255);

    const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

    return {
      bass,
      mid,
      treble,
      energy,
      frequencyData: freqData,
    };
  }

  public destroy() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.analyser = null;
    this.gainNode = null;
    this.audioElement = null;
  }
}

export const globalAudioEngine = new AudioEngine();
