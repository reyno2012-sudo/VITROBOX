import React, { useState } from 'react';
import { DisplayMode, LightingTheme, TypographyStyle } from '../../types';
import { LIGHTING_THEMES } from '../../constants/presets';
import { Maximize2, Minimize2 } from 'lucide-react';

interface HardwareKnobsProps {
  volume: number; // 0..1
  onVolumeChange: (vol: number) => void;
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  theme: LightingTheme;
  onThemeChange: (theme: LightingTheme) => void;
  bassMultiplier: number;
  onBassMultiplierChange: (val: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  typographyStyle?: TypographyStyle;
  onTypographyStyleChange?: (style: TypographyStyle) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * Minimalist Hardware Controls & Status Bar:
 * - Pure industrial design: fades in smoothly when mouse hovers over the speaker unit
 * - Allows the #141416 black gallery frame to remain 100% pristine and unadorned when idle
 * - Contains brand mark, play/pause switch, visual mode dial, typography style selector, theme selector, bass & volume knobs, and fullscreen icon
 */
export const HardwareKnobs: React.FC<HardwareKnobsProps> = ({
  volume,
  onVolumeChange,
  mode,
  onModeChange,
  theme,
  onThemeChange,
  bassMultiplier,
  onBassMultiplierChange,
  isPlaying,
  onTogglePlay,
  typographyStyle = 'pop_sticker',
  onTypographyStyleChange,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Cycle display mode
  const modes: DisplayMode[] = ['aquarium', 'graphic_poster', 'fluid_spectrum', 'minimalist'];
  const modeLabels: Record<DisplayMode, string> = {
    aquarium: '水族悬浮 (Aquarium Float)',
    graphic_poster: '情绪海报 (Mood Graphic)',
    fluid_spectrum: '流体频谱 (Fluid Waves)',
    minimalist: '极简空间 (Minimalist)',
  };

  const handleNextMode = () => {
    const nextIdx = (modes.indexOf(mode) + 1) % modes.length;
    onModeChange(modes[nextIdx]);
  };

  // Cycle typography styles
  const styles: TypographyStyle[] = ['pop_sticker', 'swiss_editorial', 'floating_mist'];
  const styleLabels: Record<TypographyStyle, string> = {
    pop_sticker: '提前淡入 (Fade)',
    swiss_editorial: '简洁淡入 (Clean)',
    floating_mist: '描边淡入 (Outline)',
  };

  const handleNextStyle = () => {
    if (!onTypographyStyleChange) return;
    const current = typographyStyle || 'pop_sticker';
    const nextIdx = (styles.indexOf(current) + 1) % styles.length;
    onTypographyStyleChange(styles[nextIdx]);
  };

  // Cycle lighting theme
  const themeKeys = Object.keys(LIGHTING_THEMES) as LightingTheme[];
  const handleNextTheme = () => {
    const nextIdx = (themeKeys.indexOf(theme) + 1) % themeKeys.length;
    onThemeChange(themeKeys[nextIdx]);
  };

  // Convert volume (0..1) to knob angle (-135deg to +135deg)
  const volumeAngle = -135 + volume * 270;
  // Bass angle
  const bassAngle = -135 + ((bassMultiplier - 0.5) / 1.5) * 270;

  return (
    <div className="w-full flex items-center justify-between px-5 py-2 bg-[#14161a]/95 backdrop-blur-md border border-[#2b3038] rounded-lg text-neutral-300 shadow-[0_12px_28px_rgba(0,0,0,0.85)] transition-all select-none">
      {/* Left: Brand Wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-bold tracking-[0.22em] text-[#e2e8f0] uppercase">
          VITROBOX
        </span>
        <span className="text-[10px] font-mono text-[#8a929d] tracking-wider">
          Reyno LAB
        </span>
      </div>

      {/* Right: Tactile Hardware Knobs & Switches */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* 1. Power / Play Toggle Switch */}
        <button
          onClick={onTogglePlay}
          onMouseEnter={() => setActiveTooltip('电源 / 播放')}
          onMouseLeave={() => setActiveTooltip(null)}
          title="播放 / 暂停"
          className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-[#181a1e] hover:bg-[#22252b] active:scale-95 border border-[#353b44] rounded-md shadow-sm transition-all cursor-pointer"
        >
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              isPlaying ? 'bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]' : 'bg-[#64748b]'
            }`}
          />
          <span className="text-[11px] font-mono tracking-wider text-neutral-300">
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </span>
        </button>

        {/* 2. Visual Mode Dial Button */}
        <button
          onClick={handleNextMode}
          onMouseEnter={() => setActiveTooltip(`显示模式: ${modeLabels[mode]}`)}
          onMouseLeave={() => setActiveTooltip(null)}
          className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-[#181a1e] hover:bg-[#22252b] active:scale-95 border border-[#353b44] rounded-md shadow-sm transition-all cursor-pointer"
        >
          <span className="text-[10px] font-mono text-[#8e97a3] uppercase">MODE</span>
          <span className="text-[11px] font-sans font-medium text-neutral-200">
            {mode === 'aquarium'
              ? '水族'
              : mode === 'graphic_poster'
              ? '海报'
              : mode === 'fluid_spectrum'
              ? '声波'
              : '极简'}
          </span>
        </button>

        {/* 3. Typography Style Selector (Style A / B / C) */}
        {onTypographyStyleChange && (
          <button
            onClick={handleNextStyle}
            onMouseEnter={() =>
              setActiveTooltip(`歌词风格: ${styleLabels[typographyStyle]}`)
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-[#181a1e] hover:bg-[#22252b] active:scale-95 border border-[#353b44] rounded-md shadow-sm transition-all cursor-pointer"
          >
            <span className="text-[10px] font-mono text-[#8e97a3] uppercase">STYLE</span>
            <span className="text-[11px] font-sans font-medium text-neutral-200">
              {typographyStyle === 'pop_sticker'
                ? '淡入'
                : typographyStyle === 'swiss_editorial'
                ? '简洁'
                : '描边'}
            </span>
          </button>
        )}

        {/* 4. Ambient Lighting Switcher */}
        <button
          onClick={handleNextTheme}
          onMouseEnter={() => setActiveTooltip(`氛围灯效: ${LIGHTING_THEMES[theme]?.name}`)}
          onMouseLeave={() => setActiveTooltip(null)}
          className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-[#181a1e] hover:bg-[#22252b] active:scale-95 border border-[#353b44] rounded-md shadow-sm transition-all cursor-pointer"
        >
          <div
            className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/20"
            style={{ backgroundColor: LIGHTING_THEMES[theme]?.color }}
          />
          <span className="text-[11px] font-sans font-medium text-neutral-200">
            {LIGHTING_THEMES[theme]?.name.split(' ')[0]}
          </span>
        </button>

        {/* 5. Bass Excursion Dial */}
        <div
          className="relative flex items-center gap-1.5 cursor-pointer group"
          onMouseEnter={() =>
            setActiveTooltip(`低音振膜幅度: ${(bassMultiplier * 100).toFixed(0)}%`)
          }
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <span className="text-[10px] font-mono text-[#8e97a3] uppercase">BASS</span>
          <div
            onClick={() => {
              const nextVal = bassMultiplier >= 1.8 ? 0.6 : bassMultiplier + 0.4;
              onBassMultiplierChange(Math.round(nextVal * 10) / 10);
            }}
            className="relative w-5.5 h-5.5 rounded-full bg-gradient-to-br from-[#2f343c] via-[#1c1f24] to-[#0f1114] border border-[#444a53] shadow-sm flex items-center justify-center transition-transform"
          >
            <div
              className="absolute w-0.5 h-2 bg-[#dbe8ee] rounded-full top-0.5 transition-transform duration-100"
              style={{ transform: `rotate(${bassAngle}deg)`, transformOrigin: 'center 7px' }}
            />
          </div>
        </div>

        {/* 6. Rotary Volume Knob */}
        <div
          className="relative flex items-center gap-1.5 cursor-pointer group"
          onMouseEnter={() => setActiveTooltip(`主音量: ${(volume * 100).toFixed(0)}%`)}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <span className="text-[10px] font-mono text-[#8e97a3] uppercase">VOL</span>
          <div
            onClick={() => {
              const nextVol = volume >= 0.95 ? 0.2 : volume + 0.2;
              onVolumeChange(Math.round(nextVol * 10) / 10);
            }}
            className="relative w-6 h-6 rounded-full bg-gradient-to-br from-[#383e47] via-[#21242a] to-[#111316] border border-[#4f5763] shadow-sm flex items-center justify-center"
          >
            <div
              className="absolute w-0.5 h-2.5 bg-[#38bdf8] rounded-full top-0.5 transition-transform duration-100"
              style={{ transform: `rotate(${volumeAngle}deg)`, transformOrigin: 'center 8px' }}
            />
          </div>
        </div>

        {/* 7. Fullscreen Button (Icon Only) */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            onMouseEnter={() =>
              setActiveTooltip(isFullscreen ? '退出全屏 (ESC)' : '全屏模式 (F)')
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className={`group relative flex items-center justify-center p-1.5 bg-[#181a1e] hover:bg-[#22252b] active:scale-95 border rounded-md shadow-sm transition-all cursor-pointer ${
              isFullscreen ? 'border-[#38bdf8] text-[#38bdf8]' : 'border-[#353b44] text-neutral-300'
            }`}
            title="全屏模式"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Active Tooltip Popover */}
        {activeTooltip && (
          <div className="absolute top-10 right-6 px-2 py-0.5 bg-[#0b0c0e]/95 text-[10px] font-sans text-neutral-200 rounded border border-[#2b3038] shadow-lg pointer-events-none z-50">
            {activeTooltip}
          </div>
        )}
      </div>
    </div>
  );
};
