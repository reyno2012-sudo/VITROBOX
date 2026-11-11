import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { AudioAnalysis, DisplayMode, LightingTheme, LyricLine, TypographyStyle, Track } from '../../types';
import { ParticleLyricStage } from './ParticleLyricStage';
import { SpeakerDrivers } from './SpeakerDrivers';
import { OuterGlassPane } from './OuterGlassPane';
import { Chamber3DWalls } from './Chamber3DWalls';
import { LIGHTING_THEMES } from '../../constants/presets';
import { Minimize2 } from 'lucide-react';
import { FRAME_MATERIALS, FrameMaterial, frameMaterialStyle } from '../../constants/frameMaterials';
import { DEMO_VIDEO } from '../../constants/demoVideo';
import { cabinetViews, defaultParticleSettings, type ParticleSettings } from '../../visuals/particleSettings';
import { HardwareDisplay } from './HardwareDisplay';
import './CabinetScene.css';

export interface VitroboxSpeakerProps {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  theme: LightingTheme;
  onThemeChange: (theme: LightingTheme) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  bassMultiplier: number;
  onBassMultiplierChange: (val: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  lyrics: LyricLine[];
  trackTitle: string;
  trackArtist: string;
  coverArt?: string;
  trackAlbum?: string;
  tracks?: Track[];
  onSelectTrack?: (track: Track) => void;
  audioAnalysis: AudioAnalysis;
  viewEnvironment: 'desktop' | 'fullscreen';
  typographyStyle?: TypographyStyle;
  onTypographyStyleChange?: (style: TypographyStyle) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  backgroundColor?: string;
  backgroundGlow?: string;
  frameMaterial?: FrameMaterial;
  particleSettings?: ParticleSettings;
  onVisualSettingsChange?: (patch: Partial<ParticleSettings>) => void;
  externalPlayback?: boolean;
  demoVideoUrl?: string;
  demoVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onVideoTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoLoadedMetadata?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoPlay?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoPause?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoEnded?: React.ReactEventHandler<HTMLVideoElement>;
}

export const VitroboxSpeaker: React.FC<VitroboxSpeakerProps> = ({
  mode,
  onModeChange,
  theme,
  onThemeChange,
  volume,
  onVolumeChange,
  bassMultiplier,
  onBassMultiplierChange,
  isPlaying,
  onTogglePlay,
  currentTime,
  lyrics,
  trackTitle,
  trackArtist,
  coverArt,
  trackAlbum,
  tracks = [],
  onSelectTrack,
  audioAnalysis,
  viewEnvironment,
  typographyStyle,
  onTypographyStyleChange,
  isFullscreen = false,
  onToggleFullscreen,
  backgroundColor = '#090c0f',
  backgroundGlow = 'rgba(72, 83, 92, .16)',
  frameMaterial = FRAME_MATERIALS[0],
  particleSettings = defaultParticleSettings,
  onVisualSettingsChange,
  externalPlayback = false,
  demoVideoUrl,
  demoVideoRef,
  onVideoTimeUpdate,
  onVideoLoadedMetadata,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState({ pitch: 0, yaw: 0 });
  const [dragging, setDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 850, height: 520 });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const camera = cabinetViews.find(view => view.id === particleSettings.cameraView) ?? cabinetViews[0];
  const liveCamera = useRef({ particleSettings, onVisualSettingsChange, isFullscreen });
  useLayoutEffect(() => {
    liveCamera.current = { particleSettings, onVisualSettingsChange, isFullscreen };
  });
  useEffect(() => {
    setRotation({ pitch: camera.pitch, yaw: camera.yaw });
    pointer.current = null;
    setDragging(false);
  }, [camera, isFullscreen]);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      const { particleSettings: current, onVisualSettingsChange: change, isFullscreen: fullscreen } = liveCamera.current;
      if (fullscreen || !change || (event.target as HTMLElement).closest('button, input, a')) return;
      event.preventDefault();
      change({ cameraZoom: Math.max(0.75, Math.min(1.3, current.cameraZoom - event.deltaY * 0.0006)) });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener('wheel', wheel);
    };
  }, []);
  const parallax = isFullscreen ? { x: 0, y: 0 } : { x: rotation.yaw / 12, y: rotation.pitch / 10 };
  const displayMode = mode === 'minimalist' ? 'ambient' : particleSettings.displayMode;
  const activeTheme = LIGHTING_THEMES[theme] || LIGHTING_THEMES.pure_white;
  const introEndTime = lyrics.length ? Math.max(0, lyrics[0].time) : Number.POSITIVE_INFINITY;
  const introFadeStart = Number.isFinite(introEndTime) ? Math.max(0, introEndTime - 2.5) : Number.POSITIVE_INFINITY;
  const introFadeProgress = Number.isFinite(introEndTime) && currentTime > introFadeStart
    ? Math.min(1, Math.max(0, (currentTime - introFadeStart) / (introEndTime - introFadeStart)))
    : 0;

  // Real-time bass vibration
  const bassIntensity = audioAnalysis.bass;

  const finishDrag = () => {
    pointer.current = null;
    setDragging(false);
  };

  return (
    <div
      className={`relative w-full flex items-center justify-center select-none transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen z-50 p-0 m-0'
          : viewEnvironment === 'desktop'
          ? 'py-2 md:py-6 max-h-[calc(100vh-140px)] -translate-y-[8vh]'
          : 'h-full p-2'
      }`}
      style={{
        perspective: isFullscreen ? '2200px' : '1700px',
        backgroundColor,
        backgroundImage: `radial-gradient(circle at 50% 18%, ${backgroundGlow}, transparent 46%)`,
      }}
    >
      {!isFullscreen && particleSettings.roomMode === 'walnut' && <div className="cabinet-walnut-desk" aria-hidden="true" />}
      {/* Quick floating exit button when in true Fullscreen mode */}
      {isFullscreen && onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="fixed top-4 right-6 z-50 p-2.5 bg-[#14171d]/90 hover:bg-[#202530] text-neutral-200 hover:text-white rounded-lg border border-[#333a46] shadow-2xl backdrop-blur-md transition-all cursor-pointer opacity-70 hover:opacity-100 flex items-center justify-center"
          title="退出全屏 (ESC)"
        >
          <Minimize2 className="w-4 h-4 text-[#38bdf8]" />
        </button>
      )}

      {/* ----------------- SPEAKER HARDWARE ENCLOSURE (16:9 Standard) ----------------- */}
      <div
        ref={containerRef}
        onPointerDown={event => {
          if (isFullscreen || event.button !== 0 || (event.target as HTMLElement).closest('button, input, a')) return;
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={event => {
          const last = pointer.current;
          if (!last || last.id !== event.pointerId) return;
          const dx = event.clientX - last.x;
          const dy = event.clientY - last.y;
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          setRotation(previous => ({
            yaw: Math.max(-50, Math.min(50, previous.yaw + dx * 0.2)),
            pitch: Math.max(-22, Math.min(22, previous.pitch - dy * 0.16)),
          }));
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onKeyDown={event => {
          if (isFullscreen || event.target !== event.currentTarget) return;
          if (event.key.startsWith('Arrow')) {
            event.preventDefault();
            setRotation(previous => ({
              yaw: Math.max(-50, Math.min(50, previous.yaw + (event.key === 'ArrowRight' ? 4 : event.key === 'ArrowLeft' ? -4 : 0))),
              pitch: Math.max(-22, Math.min(22, previous.pitch + (event.key === 'ArrowDown' ? 4 : event.key === 'ArrowUp' ? -4 : 0))),
            }));
          } else if (event.key === 'Home') {
            setRotation({ pitch: 0, yaw: 0 });
            onVisualSettingsChange?.({ cameraView: 'front', cameraZoom: 1 });
          }
        }}
        tabIndex={isFullscreen ? undefined : 0}
        role="group"
        aria-label="音箱三维视图，可拖拽旋转、滚轮缩放，方向键旋转，Home 复位"
        data-dragging={dragging}
        data-display-mode={displayMode}
        className={`cabinet-scene group relative flex flex-col items-center ${
          isFullscreen
            ? 'w-screen h-screen max-w-none aspect-auto'
            : viewEnvironment === 'desktop'
            ? 'w-[min(95%,112vh)] max-w-[1100px] aspect-[515/316]'
            : 'w-[min(96vw,137vh)] max-w-[1240px] aspect-[515/316]'
        }`}
        style={{
          ...frameMaterialStyle(frameMaterial),
          '--cabinet-width': `${dimensions.width}px`,
          '--cabinet-height': `${dimensions.height}px`,
          '--cabinet-depth': isFullscreen ? '0px' : `${dimensions.width * 0.115}px`,
          transform: isFullscreen ? 'none' : `translate(${camera.x}%, ${camera.y}%) rotateX(${rotation.pitch}deg) rotateY(${rotation.yaw}deg) scale(${camera.zoom * particleSettings.cameraZoom})`,
          transformStyle: 'preserve-3d',
        } as React.CSSProperties}
      >
        {!isFullscreen && <>
          <div className="cabinet-side cabinet-side--back" aria-hidden="true"><span>VITROBOX · REYNO LAB</span></div>
          <div className="cabinet-side cabinet-side--top" aria-hidden="true"><i /><span>VITROBOX / KINETIC SOUND</span><i /></div>
          <div className="cabinet-side cabinet-side--bottom" aria-hidden="true" />
          <div className="cabinet-side cabinet-side--left" aria-hidden="true"><span className="cabinet-vents" /></div>
          <div className="cabinet-side cabinet-side--right">
            <i className="cabinet-screw" aria-hidden="true" />
            <button className="cabinet-side-knob" type="button" onClick={onTogglePlay} aria-label={isPlaying ? '侧面暂停播放' : '侧面开始播放'} />
            <span className="cabinet-engraving" aria-hidden="true">VITROBOX</span>
            <i className="cabinet-screw" aria-hidden="true" />
          </div>
        </>}
        {/* Outer Matte Black Metal Cabinet Frame (#141416 Gallery Picture Frame) */}
        <div
          data-frame-material={frameMaterial.id}
          className={`cabinet-front speaker-material-frame relative w-full h-full border shadow-[0_28px_65px_rgba(0,0,0,0.92),0_10px_25px_rgba(0,0,0,0.7)] ${
            'rounded-[1.5%] p-[3%]'
          }`}
          style={{
            ...frameMaterialStyle(frameMaterial),
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Subtle top edge metallic bevel hairline */}
          <div className="frame-edge-highlight absolute inset-x-0 top-0 h-[1.5px] pointer-events-none" />

          {/* Physical Side Rotary Control Knob (Preserved on the right edge as requested) */}
          {!isFullscreen && (
            <button
              type="button"
              className="absolute -right-3 sm:-right-3.5 top-[28%] w-3 sm:w-3.5 h-11 sm:h-12 rounded-r-md bg-gradient-to-r from-[#9a3412] via-[#ea580c] to-[#c2410c] border-y border-r border-[#f97316]/50 shadow-[3px_4px_12px_rgba(0,0,0,0.85)] flex flex-col justify-around py-1.5 px-0.5 cursor-pointer z-40 transition-transform hover:scale-105 active:scale-95"
              title="侧置旋钮，点击播放或暂停"
              aria-label="侧置旋钮，点击播放或暂停"
              onClick={onTogglePlay}
            >
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
            </button>
          )}

          {/* ----------------- 3D DUAL-LAYER VITRINE CHAMBER (3D 内腔结构) ----------------- */}
          <div
            className="relative w-full h-full rounded-sm overflow-hidden bg-black @container border border-[#1d2128]"
            style={{
              perspective: isFullscreen ? '2200px' : '1600px',
              transformStyle: 'preserve-3d',
              containerType: 'inline-size',
            }}
          >
            {/* === LAYER 1: RECESSED INNER DISPLAY SCREEN (通透背景板，退后 8cm) === */}
            <div className="absolute inset-0 select-none overflow-hidden" style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-1 sm:inset-2 rounded-sm overflow-hidden border border-[#2a303a]/80"
                style={{
                  transform: `translate3d(${parallax.x * -1.8}px, ${parallax.y * -1.4}px, -80px)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.12s ease-out',
                }}>
                <video
                  ref={demoVideoRef}
                  className={`a2-demo-video ${demoVideoUrl ? '' : 'hidden'}`}
                  src={demoVideoUrl || DEMO_VIDEO.url}
                  playsInline
                  preload={demoVideoUrl ? 'metadata' : 'none'}
                  onTimeUpdate={onVideoTimeUpdate}
                  onLoadedMetadata={onVideoLoadedMetadata}
                  onPlay={onVideoPlay}
                  onPause={onVideoPause}
                  onEnded={onVideoEnded}
                  aria-label="I'm Upping My P(doom) demonstration video"
                />
                {demoVideoUrl ? (
                  <>
                    <div className="a2-demo-video-grade" aria-hidden="true" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.bgGradient} opacity-[0.13] mix-blend-soft-light pointer-events-none`} aria-hidden="true" />
                    <div className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ backgroundColor: activeTheme.waterTint }} aria-hidden="true" />
                  </>
                ) : (
                  <>
                  <ParticleLyricStage
                    settings={particleSettings}
                    isPlaying={isPlaying}
                    externalPlayback={externalPlayback}
                    minimalist={mode === 'minimalist'}
                    currentTime={currentTime}
                    lyrics={lyrics}
                    audioAnalysis={audioAnalysis}
                    typographyStyle={typographyStyle}
                  />
                  <HardwareDisplay mode={displayMode} isPlaying={isPlaying}
                    currentTime={currentTime} lyrics={lyrics} showLyrics={particleSettings.showLyrics}
                    title={trackTitle} artist={trackArtist} album={trackAlbum} coverArt={coverArt}
                    tracks={tracks} onSelectTrack={onSelectTrack} audioAnalysis={audioAnalysis} />
                  </>
                )}
              </div>
            </div>

            {/* === LAYER 2: 3D INNER CHAMBER WALLS (4-Sided Trapezoid Perspective Box) === */}
            {!demoVideoUrl && displayMode === 'particles' && currentTime < introEndTime && (
              <div
                className={`a2-idle a2-idle--particle ${coverArt ? 'a2-idle--with-cover' : ''}`}
                style={{
                  opacity: 1 - introFadeProgress,
                  transform: `translateY(${-introFadeProgress * 1.2}cqw) scale(${1 - introFadeProgress * 0.025})`,
                  filter: `blur(${introFadeProgress * 2}px)`,
                }}
              >
                {coverArt && <img src={coverArt} alt={`${trackTitle} 唱片海报`} />}
                <strong>{trackTitle}</strong>
                <small>{trackArtist}</small>
              </div>
            )}
            <Chamber3DWalls
              theme={theme}
              parallax={{ x: parallax.x, y: parallax.y }}
              bassIntensity={bassIntensity}
            />

            {/* === LAYER 3: SUSPENDED HOLLOW RING SPEAKERS (中层悬浮中空扬声器环) === */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                transform: `translate3d(${parallax.x * 0.4}px, ${parallax.y * 0.3}px, 28px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {particleSettings.showSpeakers && <SpeakerDrivers
                bassIntensity={bassIntensity}
                midIntensity={audioAnalysis.mid}
                excursionMultiplier={bassMultiplier}
              />}
            </div>

            {/* === LAYER 4: HIGH-GLOSS OUTER GLASS PANE (外层高透光学钢化玻璃) === */}
            <OuterGlassPane
              parallax={{ x: parallax.x, y: parallax.y }}
              theme={theme}
              bassIntensity={bassIntensity}
              sheen={particleSettings.glassSheen}
            />
          </div>
        </div>

        {/* ----------------- METALLIC ISOLATION FEET (Underneath Speaker) ----------------- */}
        {!isFullscreen && (
          <div className="absolute -bottom-3 inset-x-8 flex justify-between pointer-events-none">
            {/* Left isolation foot */}
            <div className="flex gap-16">
              <div className="w-10 h-3.5 bg-gradient-to-b from-[#3a3f47] via-[#1a1c20] to-[#0c0d0f] rounded-b-md border-x border-b border-[#4f5763] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
                <div className="w-6 h-1 bg-[#101214] rounded-full" />
              </div>
              <div className="w-10 h-3.5 bg-gradient-to-b from-[#3a3f47] via-[#1a1c20] to-[#0c0d0f] rounded-b-md border-x border-b border-[#4f5763] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
                <div className="w-6 h-1 bg-[#101214] rounded-full" />
              </div>
            </div>
            {/* Right isolation foot */}
            <div className="flex gap-16">
              <div className="w-10 h-3.5 bg-gradient-to-b from-[#3a3f47] via-[#1a1c20] to-[#0c0d0f] rounded-b-md border-x border-b border-[#4f5763] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
                <div className="w-6 h-1 bg-[#101214] rounded-full" />
              </div>
              <div className="w-10 h-3.5 bg-gradient-to-b from-[#3a3f47] via-[#1a1c20] to-[#0c0d0f] rounded-b-md border-x border-b border-[#4f5763] shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
                <div className="w-6 h-1 bg-[#101214] rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* ----------------- DESKTOP COUNTERTOP CONTACT SHADOW & REFLECTION ----------------- */}
        {!isFullscreen && viewEnvironment === 'desktop' && (
          <div
            className="absolute -bottom-10 inset-x-4 h-10 pointer-events-none rounded-full blur-xl opacity-80 transition-opacity duration-300"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.95) 0%, ${activeTheme.ambientGlow} 35%, transparent 75%)`,
              transform: `scaleY(0.4) scaleX(${1 + bassIntensity * 0.1})`,
            }}
          />
        )}
      </div>
    </div>
  );
};
