import React, { useState, useRef } from 'react';
import { AudioAnalysis, DisplayMode, LightingTheme, LyricLine, TypographyStyle } from '../../types';
import { AquariumTankCanvas } from './AquariumTankCanvas';
import { SpeakerDrivers } from './SpeakerDrivers';
import { HardwareKnobs } from './HardwareKnobs';
import { OuterGlassPane } from './OuterGlassPane';
import { Chamber3DWalls } from './Chamber3DWalls';
import { LIGHTING_THEMES } from '../../constants/presets';
import { Minimize2 } from 'lucide-react';

interface MorrorArtSpeakerProps {
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
  audioAnalysis: AudioAnalysis;
  viewEnvironment: 'desktop' | 'fullscreen';
  typographyStyle?: TypographyStyle;
  onTypographyStyleChange?: (style: TypographyStyle) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const MorrorArtSpeaker: React.FC<MorrorArtSpeakerProps> = ({
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
  audioAnalysis,
  viewEnvironment,
  typographyStyle,
  onTypographyStyleChange,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0, rotX: 0, rotY: 0 });
  const activeTheme = LIGHTING_THEMES[theme] || LIGHTING_THEMES.pure_white;

  // Real-time bass vibration
  const bassIntensity = audioAnalysis.bass;

  // Interactive 3D gyroscopic tilt on mouse move with multi-plane depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    setParallax({
      x: nx * (isFullscreen ? 18 : 26),
      y: ny * (isFullscreen ? 12 : 20),
      rotX: -ny * (isFullscreen ? 5.5 : 8.5),
      rotY: nx * (isFullscreen ? 7.5 : 11.5),
    });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0, rotX: 0, rotY: 0 });
  };

  return (
    <div
      className={`relative w-full flex items-center justify-center select-none transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen z-50 bg-[#07080a] p-0 m-0'
          : viewEnvironment === 'desktop'
          ? 'py-2 md:py-6 max-h-[calc(100vh-140px)]'
          : 'h-full p-2'
      }`}
      style={{ perspective: isFullscreen ? '2200px' : '1700px' }}
    >
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group relative transition-all duration-300 ease-out flex flex-col items-center ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none aspect-[16/9]'
            : viewEnvironment === 'desktop'
            ? 'w-[95%] max-w-[1100px] aspect-[16/9] max-h-[74vh]'
            : 'w-full h-[88vh] max-w-[1240px] aspect-[16/9]'
        }`}
        style={{
          transform: `rotateX(${parallax.rotX}deg) rotateY(${parallax.rotY}deg) scale(${
            1 + bassIntensity * 0.008
          })`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Floating Minimalist Hardware Controls: Fades in smoothly on Hover, keeping the black frame pure */}
        <div
          className={`absolute z-40 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto ${
            isFullscreen
              ? 'top-4 inset-x-8 opacity-0 group-hover:opacity-100'
              : '-top-12 inset-x-0 opacity-0 group-hover:opacity-100 group-hover:-top-13'
          }`}
        >
          <HardwareKnobs
            volume={volume}
            onVolumeChange={onVolumeChange}
            mode={mode}
            onModeChange={onModeChange}
            theme={theme}
            onThemeChange={onThemeChange}
            bassMultiplier={bassMultiplier}
            onBassMultiplierChange={onBassMultiplierChange}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            typographyStyle={typographyStyle}
            onTypographyStyleChange={onTypographyStyleChange}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>

        {/* Outer Matte Black Metal Cabinet Frame (#141416 Gallery Picture Frame) */}
        <div
          className={`relative w-full h-full bg-[#141416] border border-[#262a33] shadow-[0_28px_65px_rgba(0,0,0,0.92),0_10px_25px_rgba(0,0,0,0.7)] ${
            isFullscreen ? 'rounded-none p-3 sm:p-5' : 'rounded-xl p-3 sm:p-4.5 md:p-5'
          }`}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Subtle top edge metallic bevel hairline */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#454c58]/60 to-transparent pointer-events-none" />

          {/* Physical Side Rotary Control Knob (Preserved on the right edge as requested) */}
          {!isFullscreen && (
            <div
              className="absolute -right-3 sm:-right-3.5 top-[28%] w-3 sm:w-3.5 h-11 sm:h-12 rounded-r-md bg-gradient-to-r from-[#9a3412] via-[#ea580c] to-[#c2410c] border-y border-r border-[#f97316]/50 shadow-[3px_4px_12px_rgba(0,0,0,0.85)] flex flex-col justify-around py-1.5 px-0.5 cursor-pointer z-40 transition-transform hover:scale-105 active:scale-95"
              title="SonicGlass 侧置多功能旋钮 (点击播放/暂停)"
              onClick={onTogglePlay}
            >
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
              <div className="w-full h-0.5 bg-black/40 rounded-full" />
            </div>
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
            <AquariumTankCanvas
              mode={mode}
              theme={theme}
              currentTime={currentTime}
              lyrics={lyrics}
              audioAnalysis={audioAnalysis}
              bassIntensity={bassIntensity}
              parallaxOffset={{ x: parallax.x, y: parallax.y }}
              typographyStyle={typographyStyle}
            />

            {/* === LAYER 2: 3D INNER CHAMBER WALLS (4-Sided Trapezoid Perspective Box) === */}
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
              <SpeakerDrivers
                bassIntensity={bassIntensity}
                excursionMultiplier={bassMultiplier}
              />
            </div>

            {/* === LAYER 4: HIGH-GLOSS OUTER GLASS PANE (外层高透光学钢化玻璃) === */}
            <OuterGlassPane
              parallax={{ x: parallax.x, y: parallax.y }}
              theme={theme}
              bassIntensity={bassIntensity}
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
