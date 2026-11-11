import React, { useEffect, useRef, useState } from 'react';
import { LightingTheme, Track, TypographyStyle } from '../../types';
import { FrameMaterial } from '../../constants/frameMaterials';
import { DEMO_VIDEO } from '../../constants/demoVideo';
import { Play, Pause, SkipBack, SkipForward, ImagePlus } from 'lucide-react';
import { displayModes, type ParticleSettings } from '../../visuals/particleSettings';
import './HardwareControlDock.css';

interface BottomControlDockProps {
  currentTrack: Track;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  theme: LightingTheme;
  onThemeChange: (theme: LightingTheme) => void;
  typographyStyle: TypographyStyle;
  onTypographyStyleChange: (style: TypographyStyle) => void;
  isSpotifySyncActive?: boolean;
  backgroundName: string;
  onNextBackground: () => void;
  frameMaterial: FrameMaterial;
  onNextFrameMaterial: () => void;
  visualSettings: ParticleSettings;
  onVisualSettingsChange: (patch: Partial<ParticleSettings>) => void;
  onOpenVisuals: () => void;
  onCloseVisuals: () => void;
  onOpenLyrics: () => void;
  onOpenAudio: () => void;
  bassMultiplier: number;
  onBassMultiplierChange: (value: number) => void;
  onCoverChange: (cover: string) => void;
  visualConsole: React.ReactNode;
}

const VISUAL_KNOBS = [
  { key: 'speed', label: 'SPEED', min: .2, center: 1, max: 2.5, centerPosition: 50 },
  { key: 'intensity', label: 'INTENSITY', min: .35, center: 1, max: 1.8, centerPosition: 62 },
  { key: 'contrast', label: 'CONTRAST', min: .7, center: 1, max: 1.6, centerPosition: 44 },
] as const;
const AURAS: { id: LightingTheme; label: string; color: string }[] = [
  { id: 'pure_white', label: 'White', color: '#f7f9f5' },
  { id: 'warm_amber', label: 'Pale yellow', color: '#ede2af' },
  { id: 'cyber_blue', label: 'Pale blue', color: '#b8dce9' },
  { id: 'twilight_orchid', label: 'Pale purple', color: '#d7c7e9' },
  { id: 'emerald_aurora', label: 'Pale green', color: '#c2dfce' },
  { id: 'rose', label: 'Pale pink', color: '#edcbd1' },
];

function HardwareKnob({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const change = useRef({ value, onChange });
  change.current = { value, onChange };
  const element = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; value: number; id: number } | null>(null);
  const clamp = (next: number) => Math.min(100, Math.max(0, next));
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = change.current;
      current.onChange(clamp(current.value - Math.sign(event.deltaY) * 3));
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, []);
  return (
    <div className="gear-knob-unit">
      <div ref={element} className="gear-knob" role="slider" tabIndex={0}
        aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}
        aria-description="Drag vertically or use arrow keys to rotate."
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, value, id: event.pointerId };
        }}
        onPointerMove={event => {
          if (drag.current?.id === event.pointerId) onChange(clamp(drag.current.value + (drag.current.y - event.clientY) * .7));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => {
          const delta = ({ ArrowUp: 2, ArrowRight: 2, ArrowDown: -2, ArrowLeft: -2, PageUp: 10, PageDown: -10 } as Record<string, number>)[event.key];
          if (delta !== undefined || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            onChange(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : clamp(value + delta));
          }
        }}>
        <svg className="gear-knob-scale" viewBox="0 0 64 64" aria-hidden="true">
          {Array.from({ length: 25 }, (_, index) => (
            <line key={index} x1="32" y1="3" x2="32" y2={index % 4 === 0 ? 8 : 6}
              transform={`rotate(${-135 + index * 11.25} 32 32)`}
              stroke={index / 24 <= value / 100 ? '#788982' : '#b2b1a8'} strokeWidth="1" />
          ))}
        </svg>
        <span className="gear-knob-rim" aria-hidden="true">
          <span className="gear-knob-face" />
          <span className="gear-knob-pointer" style={{ transform: `rotate(${-135 + value * 2.7}deg)` }}><i /></span>
        </span>
      </div>
      <span className="gear-label">{label}</span>
    </div>
  );
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  currentTrack, isPlaying, onTogglePlay, onPrevTrack, onNextTrack,
  currentTime, duration, onSeek, volume, onVolumeChange,
  theme, onThemeChange, typographyStyle, onTypographyStyleChange,
  onNextBackground, frameMaterial, onNextFrameMaterial,
  visualSettings, onVisualSettingsChange, onOpenVisuals, onCloseVisuals, onOpenLyrics, onOpenAudio, visualConsole,
  bassMultiplier, onBassMultiplierChange, onCoverChange,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [backgroundPulse, setBackgroundPulse] = useState(false);
  const [chassisHeight, setChassisHeight] = useState(254);
  const chassis = useRef<HTMLDivElement>(null);
  const visualsButton = useRef<HTMLButtonElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const coverReader = useRef<FileReader | null>(null);
  const [coverError, setCoverError] = useState('');
  useEffect(() => {
    setCoverError('');
    return () => coverReader.current?.abort();
  }, [currentTrack.id]);
  const readCover = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      setCoverError('请选择 8 MB 以内的图片');
      return;
    }
    coverReader.current?.abort();
    const reader = new FileReader();
    coverReader.current = reader;
    reader.onload = () => {
      if (typeof reader.result === 'string') { onCoverChange(reader.result); setCoverError(''); }
    };
    reader.onerror = () => setCoverError('图片读取失败');
    reader.readAsDataURL(file);
  };
  const visualsOpen = Boolean(visualConsole);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !visualsOpen && !collapsed) visualsButton.current?.focus({ preventScroll: true });
    wasOpen.current = visualsOpen;
  }, [visualsOpen, collapsed]);
  const isDemoVideo = currentTrack.id === DEMO_VIDEO.id;
  const displayArtist = currentTrack.id === 'weeknd-hongkong' ? 'The Weeknd (feat. Faye Wong)' : currentTrack.artist;
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const seekValue = useRef<number | null>(null);
  const trackDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const elapsed = Math.min(trackDuration, Math.max(0, Number.isFinite(currentTime) ? currentTime : 0));
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
  useEffect(() => { seekValue.current = null; setSeekPreview(null); }, [currentTrack.id, duration]);
  const commitSeek = () => {
    if (seekValue.current === null) return;
    onSeek(seekValue.current);
    seekValue.current = null;
    setSeekPreview(null);
  };
  const styles: TypographyStyle[] = ['pop_sticker', 'swiss_editorial', 'floating_mist'];
  const styleNames = { pop_sticker: 'Fade', swiss_editorial: 'Editorial', floating_mist: 'Outline' };
  const rockerOn = frameMaterial.id !== 'graphite';
  const screenModeIndex = displayModes.findIndex(([id]) => id === visualSettings.displayMode);
  const currentScreenMode = displayModes[screenModeIndex] ?? displayModes[0];
  const nextScreenMode = displayModes[(screenModeIndex + 1) % displayModes.length];
  return (
    <section className={`hardware-dock ${collapsed ? 'is-collapsed' : ''} ${visualsOpen ? 'is-showing-visuals' : ''}`}
      style={{ '--preview-chassis-height': `${chassisHeight}px` } as React.CSSProperties} aria-label="Player controls">
      <button type="button" className="gear-cinema-tab" aria-expanded={!collapsed}
        aria-controls={visualsOpen ? 'vitrobox-visual-console' : 'hardware-control-panel'} onClick={() => {
          if (visualsOpen) onCloseVisuals();
          setCollapsed(previous => !previous);
        }}>
        <span aria-hidden="true">{collapsed ? '⌃' : '⌄'}</span> Cinema View
      </button>
      <div id="hardware-control-panel" className="gear-chassis" ref={chassis} inert={collapsed || visualsOpen} hidden={visualsOpen}>
        <div className="gear-media-row" role="group" aria-label="Media controls">
          <div className="gear-display-bezel">
            <div className="gear-display">
              <div className="gear-display-heading">VITROBOX - NOW PLAYING</div>
              <div className="gear-display-body">
                <dl className="gear-display-metadata">
                  <dt>TITLE</dt><dd title={currentTrack.title}>{currentTrack.title || 'UNKNOWN TITLE'}</dd>
                  <dt>{isDemoVideo ? 'VOCALS' : 'ARTIST'}</dt><dd title={displayArtist}>{displayArtist || 'UNKNOWN ARTIST'}</dd>
                  <dt>{isDemoVideo ? 'PRODUCER' : 'ALBUM'}</dt><dd title={isDemoVideo ? DEMO_VIDEO.producer : currentTrack.album}>{isDemoVideo ? DEMO_VIDEO.producer : currentTrack.album || 'VITROBOX LIBRARY'}</dd>
                </dl>
                <span className="gear-display-vb" aria-hidden="true">VB</span>
              </div>
            </div>
          </div>
          <div className="gear-media-center">
            <div className="gear-timeline">
              <span className="gear-time">{formatTime(seekPreview ?? elapsed)}</span>
              <input className="gear-fader" type="range" aria-label="Playback position"
                aria-valuetext={`${formatTime(seekPreview ?? elapsed)} of ${formatTime(trackDuration)}`}
                min={0} max={trackDuration || 1} step={0.1} disabled={trackDuration === 0}
                value={seekPreview ?? elapsed}
                onChange={event => { seekValue.current = Number(event.target.value); setSeekPreview(seekValue.current); }}
                onPointerUp={commitSeek} onKeyUp={commitSeek} onBlur={commitSeek}
                onPointerCancel={() => { seekValue.current = null; setSeekPreview(null); }} />
              <span className="gear-time">{formatTime(trackDuration)}</span>
            </div>
            <div className="gear-hardware-controls" role="group" aria-label="Speaker and glass controls">
              <label className="gear-hardware-fader" title="玻璃折射">
                <span>GLASS <output>{Math.round(visualSettings.glassSheen * 100)}%</output></span>
                <input type="range" className="gear-fader" aria-label="玻璃折射"
                  min={0} max={1} step={.01} value={visualSettings.glassSheen}
                  onChange={event => onVisualSettingsChange({ glassSheen: Number(event.target.value) })} />
              </label>
              <label className="gear-hardware-fader" title="喇叭冲程">
                <span>STROKE <output>{Math.round(bassMultiplier * 100)}%</output></span>
                <input type="range" className="gear-fader" aria-label="喇叭冲程"
                  aria-valuetext={`${Math.round(bassMultiplier * 100)}%`}
                  min={0} max={2} step={.01} value={bassMultiplier}
                  onChange={event => onBassMultiplierChange(Number(event.target.value))} />
              </label>
            </div>
          </div>
          <div className="gear-transport">
            <div className="gear-transport-keys">
              <button type="button" className="gear-transport-key" title="Previous track" aria-label="Previous track" onClick={onPrevTrack}><SkipBack size={20} /></button>
              <button type="button" className="gear-transport-key gear-play-key" title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'} onClick={onTogglePlay}>
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button type="button" className="gear-transport-key" title="Next track" aria-label="Next track" onClick={onNextTrack}><SkipForward size={20} /></button>
            </div>
            <input className="gear-fader gear-volume-fader" type="range" aria-label="Volume" title={`Volume ${Math.round(volume * 100)}%`}
              min={0} max={1} step={0.01} value={volume} onChange={event => onVolumeChange(Number(event.target.value))} />
          </div>
        </div>
        <div className="gear-row">
          <div className="gear-section gear-modes" role="group" aria-label="Mode switches">
            <button ref={visualsButton} type="button" className="gear-mode" aria-expanded={visualsOpen}
              aria-controls={visualsOpen ? 'vitrobox-visual-console' : undefined} title="视觉控制台"
              onClick={() => { setChassisHeight(chassis.current?.offsetHeight || 254); onOpenVisuals(); }}>
              <span className="gear-led" aria-hidden="true" /><span className="gear-keycap">VISUALS</span>
            </button>
            <button type="button" className="gear-mode" aria-haspopup="dialog" title="歌词修正" onClick={onOpenLyrics}>
              <span className="gear-led" aria-hidden="true" /><span className="gear-keycap">LYRICS</span>
            </button>
            <button type="button" className="gear-mode" aria-haspopup="dialog" title="载入音频" onClick={onOpenAudio}>
              <span className="gear-led" aria-hidden="true" /><span className="gear-keycap">LOAD</span>
            </button>
            <button type="button" className="gear-mode"
              title={`当前：${currentScreenMode[1]}；下一个：${nextScreenMode[1]}`}
              aria-description={`当前模式：${currentScreenMode[1]}。点击切换至${nextScreenMode[1]}。`}
              onClick={() => onVisualSettingsChange({ displayMode: nextScreenMode[0] })}>
              <span className="gear-led" aria-hidden="true" /><span className="gear-keycap">MINIMALIST</span>
            </button>
          </div>
          <div className="gear-section gear-toggles" role="group" aria-label="Appearance">
            <button type="button" className="gear-push" title={`Subtitles: ${styleNames[typographyStyle]}`}
              onClick={() => onTypographyStyleChange(styles[(styles.indexOf(typographyStyle) + 1) % styles.length])}>
              <span className="gear-inset-led" data-lit={typographyStyle !== 'floating_mist'} aria-hidden="true" />
              <span>SUBTITLES</span>
            </button>
            <button type="button" className="gear-push" title="Cycle background"
              onClick={() => { onNextBackground(); setBackgroundPulse(previous => !previous); }}>
              <span className="gear-inset-led" data-lit={backgroundPulse} aria-hidden="true" />
              <span>BACKGROUND</span>
            </button>
            <button type="button" className="gear-rocker-unit" onClick={onNextFrameMaterial}
              title={`Frame: ${frameMaterial.englishName}. ${frameMaterial.name} · Click to cycle finishes.`}
              aria-label={`Frame finish: ${frameMaterial.englishName}. Cycle finish.`}>
              <span className={`gear-rocker ${rockerOn ? 'is-on' : ''}`} aria-hidden="true">
                <span className="gear-rocker-paddle"><i>I</i><i>O</i></span>
              </span>
              <span className="gear-label">FRAME</span>
            </button>
            <div className="gear-cover-control">
              <button type="button" className="gear-rocker-unit gear-cover-unit" title="Change cover" aria-label="换封面"
                onClick={() => coverInput.current?.click()}>
                <span className="gear-rocker" aria-hidden="true">
                  <span className="gear-rocker-paddle gear-cover-paddle"><ImagePlus size={15} /></span>
                </span>
                <span className="gear-label">COVER</span>
              </button>
              <input ref={coverInput} type="file" accept="image/*" hidden onChange={readCover} />
              {coverError && <small className="gear-cover-error" role="alert">{coverError}</small>}
            </div>
          </div>
          <div className="gear-section gear-aura" role="group" aria-label="Aura">
            <span className="gear-label">AURA</span>
            <div className="gear-lens-track">
              {AURAS.map(aura => (
                <button type="button" key={aura.id} className="gear-lens" aria-label={aura.label}
                  title={aura.label} aria-pressed={theme === aura.id} onClick={() => onThemeChange(aura.id)}
                  style={{ '--lens-color': aura.color } as React.CSSProperties}><span /></button>
              ))}
            </div>
          </div>
          <div className="gear-section gear-adjustments" role="group" aria-label="Adjustments">
            {VISUAL_KNOBS.map(({ key, label, min, center, max, centerPosition }) => {
              const setting = visualSettings[key];
              const value = setting < center
                ? centerPosition * (setting - min) / (center - min)
                : centerPosition + (100 - centerPosition) * (setting - center) / (max - center);
              return <HardwareKnob key={key} label={label} value={value} onChange={position => {
                const next = position < centerPosition
                  ? min + (center - min) * position / centerPosition
                  : center + (max - center) * (position - centerPosition) / (100 - centerPosition);
                onVisualSettingsChange({ [key]: next });
              }} />;
            })}
          </div>
        </div>
      </div>
      {visualConsole}
    </section>
  );
};
