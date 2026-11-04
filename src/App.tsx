import React, { useState, useEffect, useRef } from 'react';
import { DisplayMode, LightingTheme, Track, AudioAnalysis, TypographyStyle } from './types';
import { PRESET_TRACKS } from './constants/presets';
import { FRAME_MATERIALS } from './constants/frameMaterials';
import { globalAudioEngine } from './utils/audioEngine';
import { MorrorArtSpeaker } from './components/MorrorArtSpeaker/MorrorArtSpeaker';
import { BottomControlDock } from './components/PlayerControls/BottomControlDock';
import { UploadModal } from './components/UploadModal';
import { SpotifyConnectModal } from './components/Spotify/SpotifyConnectModal';
import { LyricsCorrectionModal } from './components/LyricsCorrectionModal';
import { useSpotifySync } from './hooks/useSpotifySync';
import { parseLrc } from './utils/lrcParser';
import { Sparkles, Music2, Maximize2, Minimize2, FilePenLine } from 'lucide-react';

const PLAYER_BACKGROUNDS = [
  { name: '石墨灰', color: '#090c0f', glow: 'rgba(72, 83, 92, .16)' },
  { name: '深岩灰', color: '#171c21', glow: 'rgba(106, 121, 132, .16)' },
  { name: '雾面灰', color: '#2b3036', glow: 'rgba(180, 188, 190, .12)' },
  { name: '工作室白', color: '#f1f0eb', glow: 'rgba(255, 255, 255, .42)' },
  { name: '冷雾白', color: '#dfe7e9', glow: 'rgba(116, 177, 194, .18)' },
  { name: '暖灰白', color: '#e7dfd4', glow: 'rgba(215, 170, 115, .18)' },
] as const;

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(PRESET_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(PRESET_TRACKS[0].duration);
  const [volume, setVolume] = useState(0.85);
  const [mode, setMode] = useState<DisplayMode>('aquarium');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('pop_sticker');
  const [theme, setTheme] = useState<LightingTheme>('pure_white');
  const [bassMultiplier, setBassMultiplier] = useState(1.0);
  const viewEnvironment = 'desktop' as const;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isLyricsCorrectionOpen, setIsLyricsCorrectionOpen] = useState(false);
  const [showGuideTip, setShowGuideTip] = useState(true);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [frameMaterialIndex, setFrameMaterialIndex] = useState(0);

  // Spotify integration hook
  const spotify = useSpotifySync();

  const handleModeChange = (newMode: DisplayMode) => {
    setMode(newMode);
    if (newMode === 'graphic_poster') setTypographyStyle('pop_sticker');
    else if (newMode === 'minimalist') setTypographyStyle('swiss_editorial');
    else setTypographyStyle('floating_mist');
  };

  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis>({
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    frequencyData: new Uint8Array(128),
  });

  const isUsingSpotify = spotify.isSyncActive && Boolean(spotify.currentSpotifyTrack);
  const activeTrack = isUsingSpotify && spotify.currentSpotifyTrack
    ? spotify.currentSpotifyTrack
    : tracks[currentTrackIndex] || PRESET_TRACKS[0];

  const activeIsPlaying = isUsingSpotify ? spotify.playbackState.isPlaying : isPlaying;
  const activeCurrentTime = isUsingSpotify ? spotify.playbackState.currentTime : currentTime;
  const activeDuration = isUsingSpotify ? spotify.playbackState.duration : duration;

  const animFrameRef = useRef<number | null>(null);

  // Pause local audio engine if Spotify becomes actively playing
  useEffect(() => {
    if (isUsingSpotify && spotify.playbackState.isPlaying) {
      globalAudioEngine.pause();
    }
  }, [isUsingSpotify, spotify.playbackState.isPlaying]);

  // Initialize AudioEngine callbacks and load initial track
  useEffect(() => {
    globalAudioEngine.setCallbacks(
      (time, dur) => {
        if (!isUsingSpotify) {
          setCurrentTime(time);
          setDuration(dur);
        }
      },
      (playing) => {
        if (!isUsingSpotify) {
          setIsPlaying(playing);
        }
      }
    );

    globalAudioEngine.setVolume(volume);
    globalAudioEngine.loadTrack(activeTrack, false);

    return () => {
      globalAudioEngine.stop();
    };
  }, []);

  // Listen to native browser Fullscreen change and keyboard shortcuts
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Real-time audio analysis loop (powers driver vibration & water ripples)
  useEffect(() => {
    const loop = () => {
      const analysis = globalAudioEngine.getAnalysis();
      setAudioAnalysis(analysis);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Toggle 16:9 Fullscreen desktop fill
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  // Track switching
  const handleSelectTrack = (track: Track) => {
    // If selecting local/preset track, deactivate Spotify sync
    spotify.setIsSyncActive(false);
    const existingIndex = tracks.findIndex((t) => t.id === track.id);
    if (existingIndex >= 0) {
      setCurrentTrackIndex(existingIndex);
    } else {
      setTracks((prev) => [track, ...prev]);
      setCurrentTrackIndex(0);
    }
    globalAudioEngine.loadTrack(track, true);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (isUsingSpotify) {
      spotify.handleRemotePrev();
      return;
    }
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIdx);
    globalAudioEngine.loadTrack(tracks[prevIdx], true);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    if (isUsingSpotify) {
      spotify.handleRemoteNext();
      return;
    }
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIdx);
    globalAudioEngine.loadTrack(tracks[nextIdx], true);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (isUsingSpotify) {
      if (spotify.playbackState.isPlaying) {
        spotify.handleRemotePause();
      } else {
        spotify.handleRemotePlay();
      }
      return;
    }

    if (isPlaying) {
      globalAudioEngine.pause();
    } else {
      globalAudioEngine.play();
    }
  };

  const handleSeek = (time: number) => {
    if (isUsingSpotify) {
      spotify.handleRemoteSeek(time);
      return;
    }
    globalAudioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    globalAudioEngine.setVolume(vol);
  };

  // Global Drag & Drop Support
  const handleWindowDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    let audioFile: File | null = null;
    let lrcFile: File | null = null;

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext || '')) {
        audioFile = file;
      } else if (ext === 'lrc' || ext === 'txt') {
        lrcFile = file;
      }
    }

    if (audioFile) {
      const audioUrl = URL.createObjectURL(audioFile);
      let parsedLyrics = [];
      if (lrcFile) {
        const text = await lrcFile.text();
        parsedLyrics = parseLrc(text).lines;
      } else {
        parsedLyrics = [
          { id: 'd-1', time: 1.0, text: audioFile.name.replace(/\.[^/.]+$/, ''), highlightWords: ['Audio'], layoutStyle: 'top_right' as const },
          { id: 'd-2', time: 6.0, text: '本地拖入音频正在播放 · 空间透明水箱透光', highlightWords: ['本地', '透明水箱'], layoutStyle: 'bottom_left' as const },
          { id: 'd-3', time: 12.0, text: '双悬浮声学振膜 随重低音律动', highlightWords: ['双悬浮', '重低音'], layoutStyle: 'top_right' as const },
          { id: 'd-4', time: 18.0, text: 'MORROR ART A2 · 空间歌词视界', highlightWords: ['MORROR', 'A2'], layoutStyle: 'bottom_left' as const },
        ];
      }

      const customTrack: Track = {
        id: `drop-${Date.now()}`,
        title: audioFile.name.replace(/\.[^/.]+$/, ''),
        artist: '拖拽载入',
        duration: 210,
        audioUrl,
        lyrics: parsedLyrics,
      };

      handleSelectTrack(customTrack);
      setShowGuideTip(false);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleWindowDrop}
      className="player-shell relative w-screen h-screen overflow-hidden flex flex-col justify-between text-neutral-200 select-none"
      style={{ backgroundColor: PLAYER_BACKGROUNDS[backgroundIndex].color, backgroundImage: `radial-gradient(circle at 50% 18%, ${PLAYER_BACKGROUNDS[backgroundIndex].glow}, transparent 46%)` }}
    >
      {/* ---------------- 1. TOP BAR CONTRACT ---------------- */}
      {!isFullscreen && (
        <header className="console-header flex items-center justify-between gap-8 px-6 md:px-10 py-3.5 border-b border-[#1f242d] bg-[#0e1014]/90 backdrop-blur-md z-30 shrink-0">
          {/* Zone 1: Brand Wordmark */}
          <div className="vitrobox-brand flex items-baseline gap-3 md:gap-4 whitespace-nowrap shrink-0">
            <span className="text-[18px] md:text-[26px] leading-tight font-bold font-mono tracking-[0.2em]">
              VITROBOX
            </span>
            <span className="text-[11px] md:text-[14px] font-mono tracking-[0.12em]">Reyno LAB</span>
          </div>

          {/* Primary actions */}
          <div className="console-actions flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsLyricsCorrectionOpen(true)}
              className="console-primary flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap"
              title="搜索、上传或校对当前歌曲的歌词"
            >
              <FilePenLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">歌词修正</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="console-primary flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap"
              title="载入音频"
            >
              <Music2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">载入音频</span>
            </button>
            {/* Spotify Connect Button */}
            <button
              onClick={() => setIsSpotifyModalOpen(true)}
              className={`console-spotify ${spotify.isSyncActive ? 'is-synced' : ''} flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-sm ${
                spotify.isSyncActive
                  ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/30'
                  : spotify.isAuthenticated
                  ? 'bg-[#162319] border-[#1DB954]/50 text-[#1DB954] hover:border-[#1DB954]'
                  : 'bg-[#1a1e25] hover:bg-[#252b35] border-[#333a46] text-neutral-300 hover:text-white'
              }`}
              title="连接 Spotify 获取正在播放曲目与歌词"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span className="hidden sm:inline">
                {spotify.isSyncActive
                  ? 'Spotify 同步中'
                  : spotify.isAuthenticated
                  ? `${spotify.user?.displayName || 'Spotify'} 已连接`
                  : '连接 Spotify'}
              </span>
              <span className="sm:hidden">Spotify</span>
            </button>

            {/* 16:9 Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center p-2 text-neutral-300 hover:text-white bg-[#1a1e25] hover:bg-[#252b35] border border-[#333a46] rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
              title={isFullscreen ? '退出全屏 (ESC)' : '全屏模式 (快捷键: F)'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-[#38bdf8]" />
              ) : (
                <Maximize2 className="w-4 h-4 text-[#38bdf8]" />
              )}
            </button>

          </div>
        </header>
      )}

      {/* ---------------- 2. MAIN 16:9 VIEWPORT CONTAINER ---------------- */}
      <main className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        {/* DESKTOP STUDIO BACKGROUND */}
        {!isFullscreen && viewEnvironment === 'desktop' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Top architectural wall light */}
            <div
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[350px] rounded-full blur-[120px] opacity-25"
              style={{
                background:
                  'radial-gradient(circle, rgba(215, 235, 255, 0.6) 0%, transparent 70%)',
              }}
            />

            {/* Desktop lower area: keep the active shell background continuous */}
            <div
              className="absolute bottom-0 inset-x-0 h-[38%]"
              style={{
                backgroundColor: 'transparent',
                boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.025)',
              }}
            >
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.02) 50px, rgba(255,255,255,0.02) 100px)',
                }}
              />
            </div>
          </div>
        )}

        {/* GUIDANCE TIP ON FIRST LOAD */}
        {!isFullscreen && showGuideTip && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-1.5 bg-[#161a20]/90 backdrop-blur-md border border-[#2b3340] rounded-full text-xs text-[#b8c2ce] shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles className="w-4 h-4 text-[#38bdf8] shrink-0" />
            <span>
              支持一键<strong>连接 Spotify</strong> 同步曲库与歌词，或点击全屏 (F) 体验纯粹 16:9 悬浮视界。
            </span>
            <button
              onClick={() => setShowGuideTip(false)}
              className="text-[#7d8896] hover:text-white text-xs ml-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ----------------- MORROR ART A2 SPEAKER SYSTEM (16:9 Ratio) ----------------- */}
        <MorrorArtSpeaker
          mode={mode}
          onModeChange={handleModeChange}
          theme={theme}
          onThemeChange={setTheme}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          bassMultiplier={bassMultiplier}
          onBassMultiplierChange={setBassMultiplier}
          isPlaying={activeIsPlaying}
          onTogglePlay={handleTogglePlay}
          currentTime={activeCurrentTime}
          lyrics={activeTrack.lyrics}
          trackTitle={activeTrack.title}
          trackArtist={activeTrack.artist}
          coverArt={activeTrack.coverArt}
          audioAnalysis={audioAnalysis}
          viewEnvironment={viewEnvironment}
          typographyStyle={typographyStyle}
          onTypographyStyleChange={setTypographyStyle}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          backgroundColor={PLAYER_BACKGROUNDS[backgroundIndex].color}
          backgroundGlow={PLAYER_BACKGROUNDS[backgroundIndex].glow}
          frameMaterial={FRAME_MATERIALS[frameMaterialIndex]}
        />
      </main>

      {/* ---------------- 3. UNIFIED BOTTOM CONTROL DOCK ---------------- */}
      <BottomControlDock
        currentTrack={activeTrack}
        isPlaying={activeIsPlaying}
        onTogglePlay={handleTogglePlay}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        currentTime={activeCurrentTime}
        duration={activeDuration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        mode={mode}
        onModeChange={handleModeChange}
        theme={theme}
        onThemeChange={setTheme}
        typographyStyle={typographyStyle}
        onTypographyStyleChange={setTypographyStyle}
        isSpotifySyncActive={spotify.isSyncActive}
        backgroundName={PLAYER_BACKGROUNDS[backgroundIndex].name}
        frameMaterial={FRAME_MATERIALS[frameMaterialIndex]}
        onNextFrameMaterial={() => setFrameMaterialIndex((index) => (index + 1) % FRAME_MATERIALS.length)}
        onNextBackground={() => setBackgroundIndex((index) => (index + 1) % PLAYER_BACKGROUNDS.length)}
      />

      {/* ---------------- 4. AUDIO & LRC UPLOAD / PRESET MODAL ---------------- */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSelectTrack={handleSelectTrack}
      />

      {/* ---------------- 5. SPOTIFY OAUTH & SYNC MODAL ---------------- */}
      <SpotifyConnectModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
        isAuthenticated={spotify.isAuthenticated}
        user={spotify.user}
        isSyncActive={spotify.isSyncActive}
        onToggleSync={spotify.setIsSyncActive}
        onConnect={spotify.connectSpotify}
        onConnectPkce={spotify.connectSpotifyPkce}
        onDisconnect={spotify.disconnectSpotify}
        statusMessage={spotify.statusMessage}
        currentTrackTitle={activeTrack.title}
        currentArtist={activeTrack.artist}
        lyricOffsetMs={spotify.lyricOffsetMs}
        onAdjustOffset={spotify.adjustLyricOffset}
        onResetOffset={spotify.resetLyricOffset}
        lastAuthUrl={spotify.lastAuthUrl}
        onSyncNow={spotify.pollPlayback}
        onSyncTrackDirectly={async (trackData) => {
          const newTrack = await spotify.syncTrackDirectly(trackData);
          const existingIndex = tracks.findIndex((t) => t.id === newTrack.id);
          if (existingIndex < 0) {
            setTracks((prev) => [newTrack, ...prev]);
          }
          globalAudioEngine.loadTrack(newTrack, true);
          setIsPlaying(true);
        }}
      />

      <LyricsCorrectionModal
        isOpen={isLyricsCorrectionOpen}
        track={activeTrack}
        onClose={() => setIsLyricsCorrectionOpen(false)}
        onApply={(lyrics) => {
          if (isUsingSpotify) {
            spotify.replaceCurrentSpotifyLyrics(lyrics);
            return;
          }
          setTracks((previous) => previous.map((track, index) =>
            index === currentTrackIndex ? { ...track, lyrics } : track
          ));
        }}
      />
    </div>
  );
}
