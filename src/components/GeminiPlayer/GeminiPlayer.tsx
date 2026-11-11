import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Minimize2, RotateCcw } from 'lucide-react';
import type { VitroboxSpeakerProps } from '../VitroboxSpeaker/VitroboxSpeaker';
import { ParticleLyricStage } from '../VitroboxSpeaker/ParticleLyricStage';
import { cabinetViews, defaultParticleSettings } from '../../visuals/particleSettings';
import { DEMO_VIDEO } from '../../constants/demoVideo';
import { frameMaterialStyle } from '../../constants/frameMaterials';
import { globalAudioEngine } from '../../utils/audioEngine';
import { GeminiCavityWaves } from './GeminiCavityWaves';
import cabinetHtml from './GeminiCabinet.html?raw';
import './GeminiOriginal.css';
import './GeminiPlayer.css';

const markup = { __html: cabinetHtml };
const colors = {
  pure_white: ['#dce7eb', '#c4d4da', 'rgba(56,189,248,.72)', 'rgba(251,146,60,.62)'],
  warm_amber: ['#dce7eb', '#c4d4da', 'rgba(56,189,248,.72)', 'rgba(251,146,60,.62)'],
  cyber_blue: ['#d3e7ef', '#a6c7db', 'rgba(56,189,248,.8)', 'rgba(99,102,241,.65)'],
  twilight_orchid: ['#e4d9ef', '#c2b1d6', 'rgba(192,132,252,.8)', 'rgba(244,114,182,.6)'],
  emerald_aurora: ['#d4e8de', '#a6c7b8', 'rgba(45,212,191,.75)', 'rgba(244,114,182,.55)'],
  midnight: ['#c7cdd5', '#8f9aa8', 'rgba(99,102,241,.6)', 'rgba(56,189,248,.55)'],
  rose: ['#f0dfe5', '#d6b5bd', 'rgba(244,114,182,.7)', 'rgba(251,146,60,.65)'],
} as const;
export function GeminiPlayer(props: VitroboxSpeakerProps & { entryPulse?: number }) {
  const {
    particleSettings: settings = defaultParticleSettings, onVisualSettingsChange,
    isPlaying, currentTime, trackTitle, trackArtist, trackAlbum, coverArt, tracks = [],
    lyrics, audioAnalysis, theme, frameMaterial, isFullscreen = false,
    bassMultiplier, onTogglePlay, onToggleFullscreen,
    onSelectTrack,
    demoVideoUrl, demoVideoRef, onVideoTimeUpdate, onVideoLoadedMetadata,
    onVideoPlay, onVideoPause, onVideoEnded,
  } = props;
  const cabinet = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [mediaMount, setMediaMount] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 650 });
  const [rotation, setRotation] = useState({ pitch: 0, yaw: 0 });
  const [dragging, setDragging] = useState(false);
  const [manualPulse, setManualPulse] = useState(0);
  const pulseFrame = useRef(0);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const view = cabinetViews.find(camera => camera.id === settings.cameraView) ?? cabinetViews[0];
  const screen = props.mode === 'minimalist' ? 'ambient' : settings.displayMode;
  const live = useRef({ settings, onVisualSettingsChange, isFullscreen });
  useLayoutEffect(() => { live.current = { settings, onVisualSettingsChange, isFullscreen }; });
  useLayoutEffect(() => {
    setMediaMount(cabinet.current?.querySelector('[data-media-mount]') ?? null);
  }, []);
  useEffect(() => {
    setRotation({ pitch: view.pitch, yaw: view.yaw });
    pointer.current = null;
    setDragging(false);
  }, [view, isFullscreen]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({
      width: entry.contentRect.width, height: entry.contentRect.height,
    }));
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      const current = live.current;
      if (current.isFullscreen || (event.target as Element).closest('button, input, [data-track-index]')) return;
      event.preventDefault();
      current.onVisualSettingsChange?.({ cameraZoom: Math.max(.75, Math.min(1.3, current.settings.cameraZoom - event.deltaY * .0008)) });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener('wheel', wheel);
    };
  }, []);
  useEffect(() => () => {
    cancelAnimationFrame(pulseFrame.current);
  }, []);

  const scale = Math.min(size.width * .88 / 850, size.height * .95 / 503, 1.4);
  useLayoutEffect(() => {
    const scene = cabinet.current?.querySelector<HTMLElement>('.scene-pivot');
    if (!scene) return;
    scene.classList.toggle('smooth-preset', !dragging);
    scene.style.transform = isFullscreen
      ? `scale(${size.width / 850}, ${size.height / 503})`
      : `translate3d(${view.x * scale}px,${view.y * scale}px,0) rotateX(${rotation.pitch}deg) rotateY(${rotation.yaw}deg) scale(${scale * view.zoom * settings.cameraZoom})`;
  }, [view, scale, rotation, dragging, settings.cameraZoom, isFullscreen, size]);

  useLayoutEffect(() => {
    const root = cabinet.current;
    if (!root) return;
    const setText = (id: string, value: string) => {
      const node = root.querySelector('#' + id);
      if (node) { node.textContent = value; node.setAttribute('title', value); }
    };
    for (const id of ['albumCoverImg', 'polaroidImg']) {
      const image = root.querySelector<HTMLImageElement>('#' + id);
      if (image) image.src = coverArt || './gemini-art/microphone.jpg';
    }
    for (const id of ['galleryTrackTitle', 'polaroidTitle']) setText(id, trackTitle);
    setText('galleryTrackArtist', trackArtist);
    setText('galleryTrackAlbum', trackAlbum ?? '');
    setText('albumSleeveBigText', trackTitle);
    setText('albumSleeveSubText', trackArtist);
    const caption = root.querySelector('#polaroidTitle')?.nextElementSibling;
    if (caption) caption.textContent = `曲库 ${tracks.length} 首 · VITROBOX`;
    root.querySelectorAll<HTMLElement>('[data-track-index]').forEach(node => {
      const track = tracks[Number(node.dataset.trackIndex) % tracks.length];
      node.setAttribute('aria-label', track ? `播放 ${track.title}` : '选择曲目');
    });
  }, [coverArt, trackTitle, trackArtist, trackAlbum, tracks]);

  let lyricIndex = lyrics.length - 1;
  while (lyricIndex >= 0 && lyrics[lyricIndex].time > currentTime) lyricIndex--;
  const activeLyric = settings.showLyrics ? lyrics[lyricIndex] : undefined;
  useLayoutEffect(() => {
    const root = cabinet.current;
    if (!root) return;
    const text = activeLyric?.text ?? '';
    const translation = activeLyric?.translation ?? '';
    const words = text.match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+/gu) ?? [];
    const lines = Array.from({ length: 5 }, (_, index) => words.slice(
      Math.floor(index * words.length / 5), Math.floor((index + 1) * words.length / 5),
    ).join(/[\u3400-\u9fff]/u.test(text) ? '' : ' '));
    const values: Record<string, string> = {
      albumModeLyricEN: text,
      galleryLiveLyric: text,
      brandLiveLyric: translation || text,
    };
    lines.forEach((line, index) => { values['kineticLine' + (index + 1)] = line; });
    for (const [id, value] of Object.entries(values)) {
      const node = root.querySelector<HTMLElement>('#' + id);
      if (node) node.textContent = value;
    }
    const kinetic = root.querySelector<HTMLElement>('#kineticLyricContainer');
    kinetic?.animate([{ opacity: .25, translate: '0 8px' }, { opacity: 1, translate: '0 0' }],
      { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const id of ['albumModeLyricEN', 'galleryLiveLyric']) {
        const node = root.querySelector<HTMLElement>('#' + id);
        node?.getAnimations().forEach(animation => animation.cancel());
        if (text) node?.animate([{ opacity: .25, translate: '0 6px' }, { opacity: 1, translate: '0 0' }],
          { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
  }, [activeLyric]);
  useLayoutEffect(() => {
    cabinet.current?.querySelectorAll<HTMLElement>('.mode-view').forEach(node => {
      const id = node.id.replace('mode-view-', '');
      const visible = id === (screen === 'ambient' ? 'brand' : screen) && !demoVideoUrl;
      node.classList.toggle('hidden', !visible);
      node.classList.toggle('flex', visible && ['album', 'kinetic', 'brand'].includes(id));
    });
  }, [screen, demoVideoUrl]);
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hourText = String(now.getHours()).padStart(2, '0');
      const minuteText = String(now.getMinutes()).padStart(2, '0');
      const hours = cabinet.current?.querySelector('#clockHours');
      const minutes = cabinet.current?.querySelector('#clockMinutes');
      const apertureClock = cabinet.current?.querySelector('#apertureClock');
      if (hours) hours.textContent = hourText;
      if (minutes) minutes.textContent = minuteText;
      if (apertureClock) {
        const time = `${hourText}:${minuteText}`;
        apertureClock.textContent = time;
        apertureClock.setAttribute('datetime', time);
      }
    }
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function animatePulse(duration = 550) {
    cancelAnimationFrame(pulseFrame.current);
    const start = performance.now();
    function step(now: number) {
      const value = Math.max(0, 1 - (now - start) / duration);
      setManualPulse(value * value);
      if (value > 0) pulseFrame.current = requestAnimationFrame(step);
    }
    pulseFrame.current = requestAnimationFrame(step);
    cabinet.current?.querySelectorAll<HTMLElement>('.acoustic-ripple').forEach(node => {
      node.animate([{ opacity: .85, scale: .92 }, { opacity: 0, scale: 1.38 }],
        { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  }
  function pulse() {
    globalAudioEngine.playBassPulse();
    animatePulse();
  }
  useEffect(() => {
    if (props.entryPulse) animatePulse(1400);
  }, [props.entryPulse]);
  function handleCabinetClick(event: MouseEvent<HTMLDivElement>) {
    const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-track-index]');
    if (!target) return;
    if (target.dataset.action === 'play') onTogglePlay();
    else if (target.dataset.action === 'pulse') pulse();
    else {
      const track = tracks[Number(target.dataset.trackIndex) % tracks.length];
      if (track) onSelectTrack?.(track);
    }
  }
  function resetView() {
    pointer.current = null;
    setDragging(false);
    setRotation({ pitch: 0, yaw: 0 });
    onVisualSettingsChange?.({ cameraView: 'front', cameraZoom: 1 });
    viewport.current?.focus({ preventScroll: true });
  }
  function handleCabinetKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-track-index]');
      if (target) { event.preventDefault(); target.click(); }
    }
    if (isFullscreen || event.target !== event.currentTarget) return;
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      setRotation(previous => ({
        yaw: Math.max(-62, Math.min(62, previous.yaw + (event.key === 'ArrowRight' ? 4 : event.key === 'ArrowLeft' ? -4 : 0))),
        pitch: Math.max(-32, Math.min(28, previous.pitch + (event.key === 'ArrowDown' ? 4 : event.key === 'ArrowUp' ? -4 : 0))),
      }));
    } else if (event.key === 'Home') {
      event.preventDefault();
      resetView();
    }
  }
  const bass = Math.min(1, Math.max(audioAnalysis.bass, manualPulse) * bassMultiplier);
  const palette = colors[theme];
  const introEnd = lyrics[0]?.time ?? Infinity;
  const introFade = Number.isFinite(introEnd) ? Math.max(0, Math.min(1, (currentTime - Math.max(0, introEnd - 2.5)) / Math.min(introEnd || 1, 2.5))) : 0;

  return <section className={`gemini-player ${isFullscreen ? 'is-fullscreen' : ''} ${demoVideoUrl ? 'is-video' : ''}`}
    data-screen={screen} data-playing={isPlaying} data-speakers={settings.showSpeakers}
    data-frame-material={frameMaterial?.id ?? 'graphite'}
    style={{
      ...frameMaterial && frameMaterialStyle(frameMaterial),
      '--cavity-bg-1': palette[0], '--cavity-bg-2': palette[1],
      '--halo-tl': palette[2], '--halo-br': palette[3],
      '--bass-scale': 1 + bass * .035, '--bass-excursion': `${bass * 15}px`,
      '--glass-Sheen': settings.glassSheen,
      '--minimal-lyric-scale': settings.lyricSize,
      '--mode-lyric-scale': settings.lyricSize,
      '--gemini-room-color': props.backgroundColor,
    } as CSSProperties}>
    {!isFullscreen && (Math.abs(rotation.pitch) > .4 || Math.abs(rotation.yaw) > .4) &&
      <button type="button" className="gemini-reset-view" title="恢复正面视角" aria-label="恢复正面视角"
        onClick={resetView}><RotateCcw size={20} aria-hidden="true" /></button>}

    <div ref={viewport} className="gemini-scene-viewport" tabIndex={0} role="group" aria-label="三维音箱，拖拽旋转，滚轮缩放，方向键旋转，Home 复位"
      onKeyDown={handleCabinetKey}
      onPointerDown={event => {
        if (isFullscreen || event.button !== 0 || (event.target as Element).closest('button,input,label,[data-action],[data-track-index]')) return;
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={event => {
        const last = pointer.current;
        if (!last || last.id !== event.pointerId) return;
        const dx = event.clientX - last.x, dy = event.clientY - last.y;
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        setRotation(previous => ({
          yaw: Math.max(-62, Math.min(62, previous.yaw + dx * .35)),
          pitch: Math.max(-32, Math.min(28, previous.pitch - dy * .28)),
        }));
      }}
      onPointerUp={() => { pointer.current = null; setDragging(false); }}
      onPointerCancel={() => { pointer.current = null; setDragging(false); }}
      onLostPointerCapture={() => { pointer.current = null; setDragging(false); }}>
      <div ref={cabinet} className="gemini-cabinet-markup" onClick={handleCabinetClick} dangerouslySetInnerHTML={markup} />
    </div>

    {mediaMount && createPortal(<>
      <video className="gemini-track-video" ref={demoVideoRef} src={demoVideoUrl || DEMO_VIDEO.url}
        hidden={!demoVideoUrl} preload={demoVideoUrl ? 'metadata' : 'none'} playsInline
        onTimeUpdate={onVideoTimeUpdate} onLoadedMetadata={onVideoLoadedMetadata}
        onPlay={onVideoPlay} onPause={onVideoPause} onEnded={onVideoEnded}
        aria-label="I'm Upping My P(doom) demonstration video" />
      {!demoVideoUrl && <>
        <GeminiCavityWaves bass={bass} speed={settings.speed} intensity={settings.intensity} contrast={settings.contrast}
          showLines={screen !== 'particles'} />
        {screen === 'particles' && <>
        <ParticleLyricStage settings={settings} isPlaying={isPlaying} externalPlayback={props.externalPlayback ?? false}
          minimalist={false} transparentBackground currentTime={currentTime} lyrics={lyrics} audioAnalysis={audioAnalysis} typographyStyle={props.typographyStyle} />
        {currentTime < introEnd && <div className={`a2-idle a2-idle--particle ${coverArt ? 'a2-idle--with-cover' : ''}`}
          style={{ opacity: 1 - introFade }}>
          {coverArt && <img src={coverArt} alt={trackTitle} />}<strong>{trackTitle}</strong><small>{trackArtist}</small>
        </div>}
        </>}
      </>}
    </>, mediaMount)}

    {isFullscreen && <button className="gemini-exit-fullscreen glass-panel" type="button"
      onClick={onToggleFullscreen} aria-label="退出全屏"><Minimize2 size={20} /></button>}
  </section>;
}
