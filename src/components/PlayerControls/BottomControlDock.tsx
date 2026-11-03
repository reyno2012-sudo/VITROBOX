import React, { useState } from 'react';
import { DisplayMode, LightingTheme, Track } from '../../types';
import { LIGHTING_THEMES } from '../../constants/presets';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FolderOpen,
  Monitor,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
} from 'lucide-react';

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
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  theme: LightingTheme;
  onThemeChange: (theme: LightingTheme) => void;
  viewEnvironment: 'desktop' | 'fullscreen';
  onToggleViewEnvironment: () => void;
  onOpenUploadModal: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isSpotifyConnected?: boolean;
  isSpotifySyncActive?: boolean;
  onOpenSpotifyModal?: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  mode,
  onModeChange,
  theme,
  onThemeChange,
  viewEnvironment,
  onToggleViewEnvironment,
  onOpenUploadModal,
  isFullscreen = false,
  onToggleFullscreen,
  isSpotifyConnected = false,
  isSpotifySyncActive = false,
  onOpenSpotifyModal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume || 0.8);
    }
  };

  const themeList = Object.values(LIGHTING_THEMES);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-[940px] transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Tab Button */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-4 py-1 bg-[#16181c]/90 hover:bg-[#20242b] border-t border-x border-[#333a45] rounded-t-lg text-[11px] font-mono text-[#9aa4b0] hover:text-white transition-colors backdrop-blur-md cursor-pointer shadow-lg"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>展开控制坞 (Show Controls)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>收起控制坞 (Cinema View)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Unified Control Bar */}
      <div className="p-3.5 md:p-4 rounded-2xl bg-[#14161a]/92 backdrop-blur-xl border border-[#2b313b] shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-3">
        {/* Row 1: Track Details, Timeline Scrubber, & Playback Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
          {/* Track Info */}
          <div className="flex items-center gap-2.5 min-w-[210px] shrink-0">
            <button
              onClick={onOpenUploadModal}
              title="切换歌曲或拖入本地文件"
              className="p-2.5 rounded-xl bg-[#20242b] hover:bg-[#2c323c] border border-[#37404d] text-[#38bdf8] transition-colors cursor-pointer group shrink-0"
            >
              <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            {onOpenSpotifyModal && (
              <button
                onClick={onOpenSpotifyModal}
                title={isSpotifyConnected ? 'Spotify 已连接 (点击查看状态)' : '连接 Spotify 同步曲库与歌词'}
                className={`relative p-2.5 rounded-xl border transition-all cursor-pointer group shrink-0 ${
                  isSpotifySyncActive
                    ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954] shadow-[0_0_12px_rgba(29,185,84,0.3)]'
                    : isSpotifyConnected
                    ? 'bg-[#19221c] border-[#1DB954]/50 text-[#1DB954]'
                    : 'bg-[#20242b] hover:bg-[#2c323c] border-[#37404d] text-neutral-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                {isSpotifySyncActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#1DB954] rounded-full border-2 border-[#14161a] animate-pulse" />
                )}
              </button>
            )}

            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate font-sans">
                  {currentTrack.title}
                </span>
                {isSpotifySyncActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1DB954]/20 text-[#1DB954] font-mono shrink-0">
                    SPOTIFY
                  </span>
                )}
              </div>
              <div className="text-xs text-[#8c96a3] truncate">
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3 flex-1">
            <span className="text-[11px] font-mono tabular-nums text-[#8a94a2] w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-[#252b34] rounded-lg appearance-none cursor-pointer accent-[#38bdf8] hover:bg-[#2f3743] transition-colors"
            />
            <span className="text-[11px] font-mono tabular-nums text-[#8a94a2] w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Playback Transport Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={onPrevTrack}
              title="上一曲"
              className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#222730] transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePlay}
              title={isPlaying ? '暂停' : '播放'}
              className="p-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={onNextTrack}
              title="下一曲"
              className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#222730] transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Lighting Themes, Visual Modes, Volume & Fullscreen */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#232730] text-xs">
          {/* Display Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#1a1d23] rounded-lg border border-[#2b313b]">
            <button
              onClick={() => onModeChange('aquarium')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                mode === 'aquarium'
                  ? 'bg-[#2b323e] text-white shadow-sm'
                  : 'text-[#8e98a5] hover:text-white'
              }`}
            >
              水族漂浮
            </button>
            <button
              onClick={() => onModeChange('graphic_poster')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                mode === 'graphic_poster'
                  ? 'bg-[#2b323e] text-white shadow-sm'
                  : 'text-[#8e98a5] hover:text-white'
              }`}
            >
              情绪海报
            </button>
            <button
              onClick={() => onModeChange('fluid_spectrum')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                mode === 'fluid_spectrum'
                  ? 'bg-[#2b323e] text-white shadow-sm'
                  : 'text-[#8e98a5] hover:text-white'
              }`}
            >
              流体声波
            </button>
            <button
              onClick={() => onModeChange('minimalist')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                mode === 'minimalist'
                  ? 'bg-[#2b323e] text-white shadow-sm'
                  : 'text-[#8e98a5] hover:text-white'
              }`}
            >
              极简
            </button>
          </div>

          {/* Lighting Theme Swatches */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#8a94a2] mr-1 hidden sm:inline">
              氛围光:
            </span>
            {themeList.map((t) => (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id as LightingTheme)}
                title={t.name}
                className={`relative w-5 h-5 rounded-full border transition-all ${
                  theme === t.id
                    ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
                style={{ backgroundColor: t.color }}
              />
            ))}
          </div>

          {/* Volume Slider & Fullscreen / Environment Toggle */}
          <div className="flex items-center gap-3">
            {/* Quick Volume Slider */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className="text-[#8e98a5] hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-[#252b34] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
              />
            </div>

            {/* View Switcher: Desktop Tabletop vs Window */}
            <button
              onClick={onToggleViewEnvironment}
              title={viewEnvironment === 'desktop' ? '切换全窗视界' : '切换桌面实物展示'}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1d23] hover:bg-[#252a33] border border-[#2b313b] rounded-lg text-[11px] font-sans text-neutral-300 transition-colors cursor-pointer"
            >
              <Monitor className="w-3 h-3 text-[#38bdf8]" />
              <span>{viewEnvironment === 'desktop' ? '全窗视界' : '桌面实物'}</span>
            </button>

            {/* Dedicated Fullscreen Button (Icon Only) */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? '退出全屏 (ESC)' : '全屏模式 (F)'}
                className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                  isFullscreen
                    ? 'bg-[#0284c7] text-white border border-[#38bdf8]'
                    : 'bg-[#1a1d23] hover:bg-[#252a33] border border-[#38bdf8]/40 text-[#38bdf8] hover:text-white'
                }`}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
