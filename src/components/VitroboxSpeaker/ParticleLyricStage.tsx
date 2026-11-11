import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { AudioAnalysis, LyricLine, TypographyStyle } from '../../types';
import { drawParticleScene } from '../../visuals/particleCanvas';
import { particlePalettes, type ParticleSettings } from '../../visuals/particleSettings';
import './ParticleLyricStage.css';

type ParticleLyricStageProps = {
  settings: ParticleSettings;
  currentTime: number;
  lyrics: LyricLine[];
  audioAnalysis: AudioAnalysis;
  isPlaying: boolean;
  externalPlayback: boolean;
  minimalist: boolean;
  typographyStyle?: TypographyStyle;
  transparentBackground?: boolean;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const readReducedMotion = () => window.matchMedia(motionQuery).matches;

const entrances = {
  rise: { duration: 0.65, curve: [0.16, 1, 0.3, 1], x: 0, y: 36, scale: 0.89, angle: 0, skew: 0, blur: 12 },
  pop: { duration: 0.6, curve: [0.2, 1.5, 0.3, 1], x: 0, y: 0, scale: 0.38, angle: -8, skew: 0, blur: 9 },
  sweep: { duration: 0.65, curve: [0.1, 0.9, 0.25, 1], x: -95, y: 0, scale: 1, angle: 0, skew: -15, blur: 5 },
  soft: { duration: 0.8, curve: [0, 0, 0.58, 1], x: 0, y: 0, scale: 1.2, angle: 0, skew: 0, blur: 20 },
} as const;

function curveProgress(progress: number, [x1, y1, x2, y2]: readonly number[]) {
  if (progress <= 0 || progress >= 1) return progress;
  const sample = (t: number, first: number, second: number) => {
    const other = 1 - t;
    return 3 * other * other * t * first + 3 * other * t * t * second + t ** 3;
  };
  let low = 0;
  let high = 1;
  for (let step = 0; step < 12; step++) {
    const midpoint = (low + high) / 2;
    if (sample(midpoint, x1, x2) < progress) low = midpoint;
    else high = midpoint;
  }
  return sample((low + high) / 2, y1, y2);
}

function useParticleCanvas(settings: ParticleSettings, isPlaying: boolean, externalPlayback: boolean, audioAnalysis: AudioAnalysis, minimalist: boolean, reduceMotion: boolean, transparentBackground: boolean) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ settings, isPlaying, externalPlayback, audioAnalysis, minimalist, reduceMotion });
  const redraw = useRef(true);
  const backdrop = useRef<HTMLImageElement | null>(null);

  useLayoutEffect(() => {
    const previous = live.current;
    if (previous.settings !== settings || previous.minimalist !== minimalist ||
      previous.reduceMotion !== reduceMotion || previous.isPlaying !== isPlaying) redraw.current = true;
    live.current = { settings, isPlaying, externalPlayback, audioAnalysis, minimalist, reduceMotion };
  }, [settings, isPlaying, externalPlayback, audioAnalysis, minimalist, reduceMotion]);

  useEffect(() => {
    backdrop.current = null;
    redraw.current = true;
    if (!settings.backgroundImage) return;
    const image = new Image();
    image.onload = () => {
      backdrop.current = image;
      redraw.current = true;
    };
    image.src = settings.backgroundImage;
    return () => { image.onload = null; };
  }, [settings.backgroundImage]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d', { alpha: transparentBackground });
    if (!element || !context) return;
    let width = 0;
    let height = 0;
    let time = 0;
    let pulse = 0;
    let previousFrame = 0;
    let frameId: number;
    function resize() {
      if (!element || !context) return;
      width = element.clientWidth;
      height = element.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw.current = true;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    function frame(now: number) {
      frameId = requestAnimationFrame(frame);
      const delta = previousFrame ? Math.min(0.05, (now - previousFrame) / 1000) : 0;
      previousFrame = now;
      const input = live.current;
      const animate = input.isPlaying && !input.reduceMotion;
      if (!context || !width || !height || (!animate && !redraw.current)) return;
      redraw.current = false;
      if (animate) {
        time += delta * input.settings.speed;
        const { bass, mid } = input.audioAnalysis;
        const beat = input.externalPlayback && bass === 0 && mid === 0
          ? 0.20 + 0.16 * Math.sin(time * 2.8) + 0.37 * Math.max(0, Math.sin(time * 3.85)) ** 9
          : clamp01(bass * 1.35 + mid * 0.35);
        pulse += (beat - pulse) * Math.min(1, delta * 8);
      }
      drawParticleScene(context, width, height, time, pulse, input.settings, backdrop.current, input.minimalist, transparentBackground);
    }
    frameId = requestAnimationFrame(frame);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [transparentBackground]);
  return canvas;
}

function LyricScene({ settings, currentTime, lyrics, minimalist, typographyStyle, reduceMotion }: Pick<ParticleLyricStageProps,
  'settings' | 'currentTime' | 'lyrics' | 'minimalist' | 'typographyStyle'> & { reduceMotion: boolean }) {
  if (!settings.showLyrics) return null;
  let index = lyrics.length - 1;
  while (index >= 0 && lyrics[index].time > currentTime) index--;
  const active = lyrics[index];
  if (!active || !active.text.trim()) return null;
  const plain = active.id === 'plain';
  const next = lyrics[index + 1];
  const previous = lyrics[index - 1];
  const layout = plain ? 'single' : settings.lyricMode;
  const entry = entrances[settings.lyricEffect] ?? entrances.rise;
  const gap = next ? next.time - active.time : Infinity;
  const duration = Math.min(entry.duration, gap / 2);
  const entranceProgress = reduceMotion || plain || duration <= 0 ? 1 : curveProgress(
    clamp01((currentTime - active.time) / duration), entry.curve,
  );
  const fadeDuration = Math.min(0.45, gap / 2);
  const exit = !reduceMotion && !plain && next && fadeDuration > 0
    ? curveProgress(clamp01(1 - (next.time - currentTime) / fadeDuration), entrances.soft.curve)
    : 0;
  const remainder = 1 - entranceProgress;
  const style: CSSProperties = {
    opacity: clamp01(entranceProgress) * (1 - exit),
    transform: `translate(${entry.x * remainder}px, ${entry.y * remainder - 22 * exit}px) rotate(${entry.angle * remainder}deg) skewX(${entry.skew * remainder}deg) scale(${1 + (entry.scale - 1) * remainder + 0.06 * exit})`,
    filter: remainder > 0 || exit > 0 ? `blur(${Math.max(0, entry.blur * remainder + 10 * exit)}px)` : undefined,
  };
  const textLength = Array.from(active.text).reduce((length, letter) =>
    length + (/[\u3400-\u9fff]/u.test(letter) ? 1 : 0.58), 0);
  const size = settings.lyricSize * (plain ? 0.58 : Math.min(1, Math.sqrt(22 / Math.max(22, textLength))));
  return (
    <div className={`particle-lyric-position ${minimalist ? 'particle-lyric-minimalist' : ''} ${plain ? 'particle-lyric-plain' : ''}`}
      style={{
        '--lyric-size': size,
        translate: `${settings.lyricX}% ${settings.lyricY}%`,
        rotate: `${settings.lyricRotation}deg`,
        color: settings.lyricColor,
        fontWeight: settings.lyricWeight,
        letterSpacing: `${settings.lyricSpacing}em`,
      } as CSSProperties}>
      <div className={`particle-lyric-scene particle-lyric-font-${settings.lyricFont}`} style={style}
        data-layout={layout} data-style={typographyStyle} data-lyric-time={active.time}>
        <div className="particle-lyric-lines">
          {layout === 'stack' && previous && <span className="particle-lyric-adjacent particle-lyric-previous">{previous.text}</span>}
          <span className="particle-lyric-current">{active.text}</span>
          {layout !== 'single' && next && <span className="particle-lyric-adjacent particle-lyric-next">{next.text}</span>}
        </div>
        {active.translation && <small className="particle-lyric-translation">{active.translation}</small>}
      </div>
    </div>
  );
}

export function ParticleLyricStage(props: ParticleLyricStageProps) {
  const { settings, isPlaying, externalPlayback, audioAnalysis, minimalist, transparentBackground = false } = props;
  const reduceMotion = useSyncExternalStore(subscribeMotion, readReducedMotion, () => true);
  const canvas = useParticleCanvas(settings, isPlaying, externalPlayback, audioAnalysis, minimalist, reduceMotion, transparentBackground);
  return (
    <div className="particle-lyric-stage" data-preset={settings.preset}
      style={{ backgroundColor: transparentBackground ? 'transparent' : (particlePalettes[settings.palette] ?? particlePalettes[0]).background }}>
      <canvas key={String(transparentBackground)} ref={canvas} className="particle-lyric-canvas" aria-hidden="true"
        style={{ filter: `hue-rotate(${settings.hue}deg) contrast(${settings.contrast})${transparentBackground ? ' brightness(.58)' : ''}` }} />
      {!minimalist && !transparentBackground && <div className="particle-lyric-wash" aria-hidden="true" />}
      <LyricScene {...props} reduceMotion={reduceMotion} />
    </div>
  );
}
