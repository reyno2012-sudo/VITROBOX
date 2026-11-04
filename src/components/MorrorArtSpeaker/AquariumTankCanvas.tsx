import { KineticLyrics } from './KineticLyrics';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AudioAnalysis, DisplayMode, LightingTheme, LyricLine, TypographyStyle } from '../../types';
import { LIGHTING_THEMES } from '../../constants/presets';
import { DEMO_VIDEO } from '../../constants/demoVideo';

interface AquariumTankCanvasProps {
  mode: DisplayMode;
  theme: LightingTheme;
  currentTime: number;
  lyrics: LyricLine[];
  fullscreenLyrics?: boolean;
  audioAnalysis: AudioAnalysis;
  bassIntensity: number;
  parallaxOffset: { x: number; y: number };
  typographyStyle?: TypographyStyle;
  demoVideoUrl?: string;
  demoVideoRef?: React.RefObject<HTMLVideoElement | null>;
  onVideoTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoLoadedMetadata?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoPlay?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoPause?: React.ReactEventHandler<HTMLVideoElement>;
  onVideoEnded?: React.ReactEventHandler<HTMLVideoElement>;
}

interface Bubble {
  x: number;
  y: number;
  z: number;
  radius: number;
  speed: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  phase: number;
  opacity: number;
}

/**
 * Format timestamp into MM:SS.SS
 */
const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

/**
 * AquariumTankCanvas recreates MORROR ART / MorningBlues avant-garde kinetic typography:
 * - Z-Index & 3D Layering: Sits behind the hollow ring speakers so text physically passes behind
 *   the black outer ring and shines through the central 100% transparent aperture.
 * - Style A: Pop Sticker (波普立体贴纸风) - Ultra-bold display font, 2px solid black stroke, hard 4px/6px solid shadows.
 * - Style B: Swiss Editorial (瑞士先锋杂志风) - 64-80px core keyword, 24px auxiliary words, 1px geometric rules & viewfinders.
 * - Style C: Floating Mist (呼吸微光风) - Fluid damping easing, previous line drifting into depth with blur(3px) & opacity 0.25.
 * - ZERO dark pill background blocks anywhere!
 */
export const AquariumTankCanvas: React.FC<AquariumTankCanvasProps> = ({
  mode,
  theme,
  currentTime,
  lyrics,
  fullscreenLyrics,
  audioAnalysis,
  bassIntensity,
  parallaxOffset,
  typographyStyle,
  demoVideoUrl,
  demoVideoRef,
  onVideoTimeUpdate,
  onVideoLoadedMetadata,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const activeTheme = LIGHTING_THEMES[theme] || LIGHTING_THEMES.pure_white;

  // Resolved typography style: auto-matched from display mode if not explicitly set
  const activeStyle: TypographyStyle =
    typographyStyle ||
    (mode === 'graphic_poster'
      ? 'pop_sticker'
      : mode === 'minimalist'
      ? 'swiss_editorial'
      : 'floating_mist');

  // Active, previous, and upcoming lyrics
  const { currentLine, prevLine, nextLine, currentIndex } = useMemo(() => {
    if (!lyrics || lyrics.length === 0) {
      return { currentLine: null, prevLine: null, nextLine: null, currentIndex: -1 };
    }

    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    return {
      currentLine: activeIdx >= 0 ? lyrics[activeIdx] : lyrics[0],
      prevLine: activeIdx > 0 ? lyrics[activeIdx - 1] : null,
      nextLine: activeIdx < lyrics.length - 1 ? lyrics[activeIdx + 1] : null,
      currentIndex: activeIdx,
    };
  }, [lyrics, currentTime]);

  // Micro-bubble particle simulation for aquarium mode
  useEffect(() => {
    const bubbles: Bubble[] = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      bubbles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        z: Math.random() * 100,
        radius: 1.2 + Math.random() * 3.4,
        speed: 0.28 + Math.random() * 0.72,
        wobbleSpeed: 0.9 + Math.random() * 2.0,
        wobbleAmp: 1.2 + Math.random() * 2.8,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.15 + Math.random() * 0.55,
      });
    }
    bubblesRef.current = bubbles;
  }, []);

  // Background water caustics & acoustic soundwaves canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const render = () => {
      time += 0.016;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Water Caustics Shimmer
      if (mode === 'aquarium' || mode === 'fluid_spectrum') {
        ctx.save();
        const energy = audioAnalysis.energy || 0.1;
        const causticAlpha = 0.035 + energy * 0.08;

        ctx.fillStyle = activeTheme.causticColor;
        ctx.globalAlpha = Math.min(0.2, causticAlpha);

        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const yOffset = (height / 3) * i;
          const waveHeight = 12 + bassIntensity * 18;
          ctx.moveTo(0, yOffset);

          for (let x = 0; x <= width; x += 36) {
            const wave1 = Math.sin(x * 0.006 + time * 0.8 + i) * waveHeight;
            const wave2 = Math.cos(x * 0.012 - time * 0.6 + i * 2) * (waveHeight * 0.6);
            ctx.lineTo(x, yOffset + wave1 + wave2);
          }
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Fluid Spectrum: Radial acoustic soundwaves from driver centers
      if (mode === 'fluid_spectrum') {
        ctx.save();
        const driver1 = { x: width * 0.15, y: height * 0.28 };
        const driver2 = { x: width * 0.85, y: height * 0.72 };

        const drawRipples = (center: { x: number; y: number }) => {
          const rings = 5;
          for (let r = 0; r < rings; r++) {
            const progress = (time * 0.7 + r / rings) % 1;
            const radius = 35 + progress * (width * 0.48);
            const alpha = (1 - progress) * 0.35 * (0.3 + bassIntensity * 0.7);

            ctx.strokeStyle = activeTheme.causticColor;
            ctx.lineWidth = 1.6 + (1 - progress) * 2;
            ctx.globalAlpha = Math.max(0, alpha);

            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
        };

        drawRipples(driver1);
        drawRipples(driver2);
        ctx.restore();
      }

      // 3. Floating 3D Micro-Bubbles
      if (mode === 'aquarium') {
        ctx.save();
        const bubbles = bubblesRef.current;
        const currentBass = bassIntensity;

        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];
          const currentSpeed = b.speed * (1 + currentBass * 1.5);
          b.y -= currentSpeed;
          b.phase += 0.02 * b.wobbleSpeed;

          const wobbleX = Math.sin(b.phase) * b.wobbleAmp;
          const px = b.x + wobbleX + parallaxOffset.x * (b.z / 100) * 14;
          const py = b.y + parallaxOffset.y * (b.z / 100) * 10;

          if (b.y < -20) {
            b.y = height + 20;
            b.x = Math.random() * width;
          }

          const depthScale = 0.6 + (b.z / 100) * 0.75;
          const currentRadius = b.radius * depthScale;

          ctx.beginPath();
          ctx.arc(px, py, currentRadius, 0, Math.PI * 2);
          ctx.strokeStyle = activeTheme.causticColor;
          ctx.lineWidth = 0.7;
          ctx.globalAlpha = b.opacity * (0.35 + (b.z / 100) * 0.5);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(
            px - currentRadius * 0.3,
            py - currentRadius * 0.3,
            currentRadius * 0.3,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = b.opacity * (0.45 + (b.z / 100) * 0.5);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode, theme, audioAnalysis, bassIntensity, parallaxOffset, activeTheme]);

  // Floating micro-sway simulation
  const [floatingTime, setFloatingTime] = useState(0);
  useEffect(() => {
    let frameId: number;
    const update = () => {
      setFloatingTime((t) => t + 0.025);
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const waterWobbleY = Math.sin(floatingTime) * 2.2;
  const waterWobbleX = Math.cos(floatingTime * 0.75) * 1.6;
  const waterTilt = Math.sin(floatingTime * 0.6) * 0.35;

  // Split lyric into balanced lines for staggered multi-line display
  const splitIntoMultiLines = (text: string): string[] => {
    const words = text.split(/\s+/);
    if (words.length <= 3) return [text];
    if (words.length <= 6) {
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    const lineCount = words.length > 9 ? 3 : 2;
    const wordsPerLine = Math.ceil(words.length / lineCount);
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }
    return lines;
  };

  // Determine if text is primarily Latin / English
  const isLatinText = (str: string): boolean => {
    return !/[\u4e00-\u9fa5]/.test(str);
  };

  // --------------------------------------------------------------------------
  // STYLE A: Pop Sticker (波普立体贴纸风)
  // - English: All uppercase ultra-bold compact sans-serif ('Anton', 'Bebas Neue', 'Oswald')
  // - Chinese: Ultra-bold sans-serif (font-weight: 900)
  // - Color: Pure white #FFFFFF, 2px solid black stroke (-webkit-text-stroke: 2px #000000)
  // - Shadow: Pure black hard 3D solid drop shadow (text-shadow: 4px 4px 0px #000, 6px 6px 0px rgba(0,0,0,0.4))
  // - Multi-line staggered layout sweeping across the canvas, passing right behind the speakers!
  // --------------------------------------------------------------------------
  const renderPopStickerStyle = () => {
    if (!currentLine) return null;
    const lines = splitIntoMultiLines(currentLine.text);

    return (
      <div
        className="absolute inset-0 flex flex-col justify-end p-[5%] select-none pointer-events-none"
        style={{
          transform: `translate3d(${waterWobbleX + parallaxOffset.x * 0.6}px, ${
            waterWobbleY + parallaxOffset.y * 0.5
          }px, -15px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Previous line ghost drifting away */}
        {prevLine && (
          <div
            className="mb-3 max-w-[85%] transition-all duration-700 ease-out origin-bottom-left"
            style={{
              opacity: 0.22,
              filter: 'blur(1.8px)',
              transform: 'translateY(-16px) scale(0.9)',
            }}
          >
            <div
              className="flex flex-col gap-0.5 leading-[1.02] tracking-tight uppercase"
              style={{
                fontFamily: isLatinText(prevLine.text)
                  ? "'Anton', 'Bebas Neue', 'Oswald', sans-serif"
                  : "'Noto Sans SC', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(20px, 3.4cqw, 48px)',
                color: '#FFFFFF',
                WebkitTextStroke: '1.5px #000000',
                textShadow: '3px 3px 0px #000000',
              }}
            >
              {splitIntoMultiLines(prevLine.text).map((chunk, i) => (
                <div key={i}>{chunk}</div>
              ))}
            </div>
          </div>
        )}

        {/* Current Active Line: High-energy Staggered Pop Sticker */}
        <div
          className="max-w-[90%] transition-transform duration-100 ease-out origin-bottom-left"
          style={{
            transform: `scale(${1 + bassIntensity * 0.035})`,
          }}
        >
          <div
            className="flex flex-col gap-1.5 leading-[0.98] uppercase tracking-normal"
            style={{
              fontFamily: isLatinText(currentLine.text)
                ? "'Anton', 'Bebas Neue', 'Oswald', sans-serif"
                : "'Noto Sans SC', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(32px, 5.6cqw, 88px)',
              color: '#FFFFFF',
              WebkitTextStroke: '2px #000000',
              textShadow: '4px 4px 0px #000000, 6px 6px 0px rgba(0,0,0,0.4)',
            }}
          >
            {lines.map((chunk, idx) => (
              <div
                key={idx}
                className="transition-all duration-500 ease-out"
                style={{
                  // Staggered indent for bold kinetic poster cadence
                  paddingLeft: `${idx * 4.5}%`,
                  transform: `translateY(${Math.sin(floatingTime + idx) * 1.5}px)`,
                }}
              >
                {chunk}
              </div>
            ))}
            {currentLine.translation && (
              <div
                className="mt-2 text-xs sm:text-sm md:text-base font-semibold tracking-wide capitalize"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  color: 'rgba(255, 255, 255, 0.94)',
                  WebkitTextStroke: '1px rgba(0,0,0,0.85)',
                  textShadow: '2px 2px 0px #000000',
                }}
              >
                {currentLine.translation}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // STYLE B: Swiss Editorial (瑞士先锋杂志风)
  // - Zero background color blocks
  // - Pure black or deep charcoal #1A1A1A (or #F1F3F5 on dark themes)
  // - Core keyword magnified to 64px-80px (font-weight: 700), auxiliary words 24px (font-weight: 300)
  // - Dynamic fine 1px geometric alignment rules, viewfinder crop brackets, timestamp & audio metadata
  // --------------------------------------------------------------------------
  const renderSwissEditorialStyle = () => {
    if (!currentLine) return null;
    const isDarkTheme = theme === 'midnight' || theme === 'cyber_blue';
    const textColor = isDarkTheme ? '#F1F3F5' : '#1A1A1A';
    const lineRuleColor = isDarkTheme ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.22)';

    // Parse words into core keyword vs auxiliary text
    const words = currentLine.text.split(/\s+/);
    let coreWord = '';
    let beforeWords = '';
    let afterWords = '';

    if (currentLine.highlightWords && currentLine.highlightWords.length > 0) {
      coreWord = currentLine.highlightWords.join(' ');
      const idx = currentLine.text.indexOf(coreWord);
      if (idx !== -1) {
        beforeWords = currentLine.text.slice(0, idx).trim();
        afterWords = currentLine.text.slice(idx + coreWord.length).trim();
      } else {
        beforeWords = words.slice(0, Math.floor(words.length / 2)).join(' ');
        coreWord = words.slice(Math.floor(words.length / 2)).join(' ');
      }
    } else if (words.length <= 2) {
      coreWord = words[words.length - 1];
      beforeWords = words.slice(0, -1).join(' ');
    } else {
      // Choose the longest word as prominent focal point
      let longestIdx = 0;
      for (let i = 1; i < words.length; i++) {
        if (words[i].length > words[longestIdx].length) longestIdx = i;
      }
      coreWord = words[longestIdx];
      beforeWords = words.slice(0, longestIdx).join(' ');
      afterWords = words.slice(longestIdx + 1).join(' ');
    }

    return (
      <div
        className="absolute inset-0 flex flex-col justify-between p-[4.5%] select-none pointer-events-none"
        style={{
          color: textColor,
          transform: `translate3d(${waterWobbleX * 0.8 + parallaxOffset.x * 0.6}px, ${
            waterWobbleY * 0.8 + parallaxOffset.y * 0.5
          }px, -15px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top Header: Swiss Typographic Grid & Precision Viewfinder */}
        <div className="w-full flex items-center justify-between pb-2 border-b" style={{ borderColor: lineRuleColor }}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase font-bold opacity-75">
              MORROR ART // EDITORIAL SYSTEM
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            <span className="font-mono text-[10px] tracking-wider opacity-60">
              TRACK 01 · {formatTimestamp(currentTime)}
            </span>
          </div>
          <div className="font-mono text-[9px] tracking-widest opacity-50 uppercase">
            SPEC · 44.1kHz · 24-BIT
          </div>
        </div>

        {/* Central Asymmetrical Typographic Block with Corner Viewfinders */}
        <div className="relative my-auto py-6 px-8 max-w-[88%]">
          {/* Top-Left & Bottom-Right Swiss Viewfinder Crop Marks (┌ ┘) */}
          <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t border-l" style={{ borderColor: textColor }} />
          <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t border-r" style={{ borderColor: textColor }} />
          <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b border-l" style={{ borderColor: textColor }} />
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b border-r" style={{ borderColor: textColor }} />

          {/* Dynamic Typographic Hierarchy: 24px auxiliary + 64px-80px core keyword */}
          <div className="flex flex-col gap-1 transition-transform duration-100 ease-out" style={{ transform: `scale(${1 + bassIntensity * 0.02})` }}>
            {beforeWords && (
              <div
                className="font-light tracking-[0.06em] uppercase opacity-80 leading-snug"
                style={{
                  fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(16px, 2.3cqw, 30px)',
                  fontWeight: 300,
                }}
              >
                {beforeWords}
              </div>
            )}

            {/* Core Oversized Keyword: 64px-80px */}
            <div
              className="font-bold tracking-tight leading-[1.05]"
              style={{
                fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
                fontSize: 'clamp(36px, 5.8cqw, 78px)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
              }}
            >
              {coreWord}
            </div>

            {afterWords && (
              <div
                className="font-light tracking-[0.06em] uppercase opacity-80 leading-snug mt-1"
                style={{
                  fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(16px, 2.3cqw, 30px)',
                  fontWeight: 300,
                }}
              >
                {afterWords}
              </div>
            )}

            {currentLine.translation && (
              <div
                className="mt-2.5 text-xs sm:text-sm md:text-base font-normal tracking-wide opacity-80"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  color: textColor,
                }}
              >
                {currentLine.translation}
              </div>
            )}
          </div>

          {/* Precision 1px Geometric Accent Line */}
          <div className="mt-4 w-32 h-[1px]" style={{ backgroundColor: textColor }} />
        </div>

        {/* Bottom Coordinates & Audio Analysis Metadata */}
        <div className="w-full flex items-center justify-between pt-2 border-t" style={{ borderColor: lineRuleColor }}>
          <div className="font-mono text-[9px] tracking-widest opacity-50 uppercase">
            ACOUSTIC VITRINE · {lyrics.length} LINES TOTAL
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-wider opacity-60">
              ENERGY: {(audioAnalysis.energy * 100).toFixed(0)}%
            </span>
            <div className="w-12 h-1 bg-current opacity-20 rounded-full overflow-hidden">
              <div
                className="h-full bg-current opacity-80 transition-all duration-75"
                style={{ width: `${Math.min(100, audioAnalysis.energy * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // STYLE C: Floating Mist (呼吸微光风)
  // - Previous line gracefully drifts upward into depth with filter: blur(3px) & opacity: 0.25
  //   using aquatic damping easing: cubic-bezier(0.22, 1, 0.36, 1)
  // - Current active line sways gently with clear luminescence and ambient text shadow
  // - Next line softly previews from below
  // - ZERO dark pill blocks!
  // --------------------------------------------------------------------------
  const renderFloatingMistStyle = () => {
    return (
      <div
        className="absolute inset-0 flex flex-col justify-center items-center px-[8%] select-none pointer-events-none"
        style={{
          transform: `translate3d(${waterWobbleX + parallaxOffset.x * 0.7}px, ${
            waterWobbleY + parallaxOffset.y * 0.6
          }px, -15px) rotate(${waterTilt}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Previous Line: Dissolving into the deep background mist */}
        {prevLine && (
          <div
            className="w-full text-center mb-4"
            style={{
              filter: 'blur(3px)',
              opacity: 0.25,
              transform: 'translateY(-28px) translateZ(-40px) scale(0.92)',
              transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
              color: activeTheme.textColor,
            }}
          >
            <div
              className="font-medium tracking-tight leading-snug"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
                fontSize: 'clamp(16px, 2.8cqw, 42px)',
                fontWeight: 500,
              }}
            >
              {prevLine.text}
            </div>
          </div>
        )}

        {/* Current Active Line: Pristine & Luminescent */}
        {currentLine && (
          <div
            className="w-full text-center my-2 transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${1 + bassIntensity * 0.03})`,
              color: activeTheme.textColor,
              textShadow: `0 3px 22px ${activeTheme.ambientGlow}`,
            }}
          >
            <div
              className="font-bold tracking-tight leading-[1.2]"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
                fontSize: 'clamp(26px, 4.8cqw, 74px)',
                fontWeight: 700,
              }}
            >
              {currentLine.text}
            </div>
            {currentLine.translation && (
              <div
                className="mt-2 text-xs sm:text-base md:text-lg font-normal tracking-wide opacity-80"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  color: activeTheme.textColor,
                }}
              >
                {currentLine.translation}
              </div>
            )}
          </div>
        )}

        {/* Next Line: Soft gentle preview drifting from below */}
        {nextLine && (
          <div
            className="w-full text-center mt-4"
            style={{
              filter: 'blur(1.6px)',
              opacity: 0.28,
              transform: 'translateY(24px) scale(0.95)',
              transition: 'all 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
              color: activeTheme.textColor,
            }}
          >
            <div
              className="font-light tracking-tight leading-snug"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
                fontSize: 'clamp(14px, 2.2cqw, 34px)',
                fontWeight: 300,
              }}
            >
              {nextLine.text}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="absolute inset-0 select-none overflow-hidden"
      style={{
        perspective: '1400px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* ---------------- 1. THE RECESSED BACKBOARD (通透鱼缸里的背景板) ---------------- */}
      <div
        className="absolute inset-1 sm:inset-2 rounded-sm overflow-hidden border border-[#2a303a]/80"
        style={{
          transform: `translate3d(${parallaxOffset.x * -1.8}px, ${parallaxOffset.y * -1.4}px, -80px)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.12s ease-out',
        }}
      >
        {/* The released demo film lives on the recessed backboard, beneath the chamber and hollow drivers. */}
        {(
          <>
            <video
              ref={demoVideoRef}
              className={`a2-demo-video ${demoVideoUrl ? '' : 'hidden'}`}
              src={DEMO_VIDEO.url}
              playsInline
              preload="metadata"
              onTimeUpdate={onVideoTimeUpdate}
              onLoadedMetadata={onVideoLoadedMetadata}
              onPlay={onVideoPlay}
              onPause={onVideoPause}
              onEnded={onVideoEnded}
              aria-label="I'm Upping My P(doom) demonstration video"
            />
            {demoVideoUrl && <div className="a2-demo-video-grade" aria-hidden="true" />}
          </>
        )}

        {/* Backboard Diffuser Screen Panel Base Gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${activeTheme.bgGradient} transition-colors duration-700 ${demoVideoUrl ? 'opacity-[0.13] mix-blend-soft-light' : ''}`}
        >
          {/* Frosted LCD Backlight Diffusion Micro-Texture */}
          <div
            className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 60%, transparent 100%)',
            }}
          />

          {/* Cinema Silhouette Stage Art (Poster Mode) */}
          {mode === 'graphic_poster' && (
            <div
              className="absolute inset-x-0 bottom-0 h-[68%] flex items-end justify-center pointer-events-none opacity-22 transition-opacity duration-700"
              style={{
                transform: `translate3d(${parallaxOffset.x * -0.6}px, 0px, 0px)`,
              }}
            >
              <div
                className="w-40 md:w-56 h-56 md:h-76 rounded-t-full bg-gradient-to-t from-black via-black/85 to-transparent blur-[1px]"
                style={{
                  maskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
                }}
              />
            </div>
          )}

          {/* Clean Backboard Inner Recessed Border Rim */}
          <div className="absolute inset-0 pointer-events-none border border-black/25" />
        </div>

        {/* ---------------- 2. PROCEDURAL CAUSTIC & BUBBLE CANVAS ---------------- */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className={`absolute inset-0 w-full h-full pointer-events-none ${fullscreenLyrics && mode !== 'fluid_spectrum' ? 'opacity-0' : 'opacity-85'}`}
        />

        {/* ---------------- 3. MORROR ART AVANT-GARDE KINETIC TYPOGRAPHY LAYER ---------------- */}
        {/* Positioned at z-index 15, in front of backboard (-80px) and behind speakers (+28px) */}
        {!demoVideoUrl && !fullscreenLyrics && activeStyle === 'pop_sticker' && renderPopStickerStyle()}
        {!demoVideoUrl && !fullscreenLyrics && activeStyle === 'swiss_editorial' && renderSwissEditorialStyle()}
        {!demoVideoUrl && !fullscreenLyrics && activeStyle === 'floating_mist' && renderFloatingMistStyle()}

        {!demoVideoUrl && fullscreenLyrics && <KineticLyrics lyrics={lyrics} currentTime={currentTime} typographyStyle={typographyStyle} theme={theme} />}

        {/* ---------------- 4. WATER MEDIUM TINT & VOLUME REFRACTION ---------------- */}
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-700 mix-blend-multiply"
          style={{
            backgroundColor: activeTheme.waterTint,
          }}
        />
      </div>
    </div>
  );
};
