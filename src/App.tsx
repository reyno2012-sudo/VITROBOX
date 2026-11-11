import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { DisplayMode, LightingTheme, Track, AudioAnalysis, TypographyStyle, LyricLine } from './types';
import { PRESET_TRACKS } from './constants/presets';
import { FRAME_MATERIALS } from './constants/frameMaterials';
import { DEMO_VIDEO } from './constants/demoVideo';
import { globalAudioEngine } from './utils/audioEngine';
import { GeminiPlayer } from './components/GeminiPlayer/GeminiPlayer';
import { HalofluxLoader } from './components/HalofluxLoader/HalofluxLoader';
import { BottomControlDock } from './components/PlayerControls/BottomControlDock';
import { UploadModal } from './components/UploadModal';
import { SpotifyConnectModal } from './components/Spotify/SpotifyConnectModal';
import { LyricsCorrectionModal } from './components/LyricsCorrectionModal';
import { useSpotifySync } from './hooks/useSpotifySync';
import { parseLrc } from './utils/lrcParser';
import { Maximize2, Minimize2, Mail } from 'lucide-react';
import { ContactModal } from './components/ContactModal';
import { VisualConsole } from './components/VisualConsole/VisualConsole';
import { defaultParticleSettings, type ParticleSettings } from './visuals/particleSettings';

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
  const [isHaloLoaderVisible, setIsHaloLoaderVisible] = useState(true);
  const [entryPulse, setEntryPulse] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(PRESET_TRACKS[0].duration);
  const [volume, setVolume] = useState(0.5);
  const [mode, setMode] = useState<DisplayMode>('aquarium');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('pop_sticker');
  const [theme, setTheme] = useState<LightingTheme>('warm_amber');
  const [bassMultiplier, setBassMultiplier] = useState(1.0);
  const viewEnvironment = 'desktop' as const;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [isLyricsCorrectionOpen, setIsLyricsCorrectionOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(5);
  const [frameMaterialIndex, setFrameMaterialIndex] = useState(0);
  const [isVisualConsoleOpen, setIsVisualConsoleOpen] = useState(false);
  const [particleSettings, setParticleSettings] = useState(defaultParticleSettings);
  const [demoLyrics, setDemoLyrics] = useState<{ trackId: string; lines: string[] } | null>(null);
  const [customCovers, setCustomCovers] = useState<Record<string, string>>({});

  const pageBackground = PLAYER_BACKGROUNDS[backgroundIndex];
  useLayoutEffect(() => {
    const { style } = document.body;
    style.setProperty('--player-page-background', pageBackground.color);
    return () => {
      style.removeProperty('--player-page-background');
    };
  }, [pageBackground.color]);

  // Spotify integration hook
  const spotify = useSpotifySync();

  const handleModeChange = (newMode: DisplayMode) => {
    setMode(newMode);
    setParticleSettings(previous => ({ ...previous, displayMode: newMode === 'minimalist' ? 'ambient' : 'particles' }));
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
  const currentDemo = demoLyrics?.trackId === activeTrack.id ? demoLyrics.lines : null;
  const stageLyrics = React.useMemo<LyricLine[]>(() => currentDemo
    ? currentDemo.map((text, index) => ({
        id: `visual-demo-${index}`,
        time: index * (Math.max(activeDuration, currentDemo.length) / currentDemo.length),
        text,
      }))
    : activeTrack.lyrics, [currentDemo, activeDuration, activeTrack.lyrics]);
  const changeVisuals = (patch: Partial<ParticleSettings>) => {
    setParticleSettings(previous => ({ ...previous, ...patch }));
    if (patch.displayMode !== undefined) setMode(patch.displayMode === 'ambient' ? 'minimalist' : 'aquarium');
    else if (patch.preset !== undefined) setMode('aquarium');
  };
  const handleAuraChange = (nextTheme: LightingTheme) => {
    setTheme(nextTheme);
    const palettes: Record<LightingTheme, [number, number]> = {
      pure_white: [0, 0], warm_amber: [1, 0], cyber_blue: [2, 0],
      twilight_orchid: [2, 48], emerald_aurora: [0, -42], midnight: [0, 0], rose: [1, 85],
    };
    const [palette, hue] = palettes[nextTheme];
    changeVisuals({ palette, hue });
  };

  const animFrameRef = useRef<number | null>(null);
  const demoVideoRef = useRef<HTMLVideoElement | null>(null);
  const isDemoVideo = !spotify.isSyncActive && activeTrack.id === DEMO_VIDEO.id;

  // Pause local audio engine if Spotify becomes actively playing
  useEffect(() => {
    if (spotify.isSyncActive) {
      globalAudioEngine.pause();
      demoVideoRef.current?.pause();
    }
  }, [spotify.isSyncActive]);

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
      if (isHaloLoaderVisible) return;
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
  }, [isFullscreen, isHaloLoaderVisible]);

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
    setIsVisualConsoleOpen(false);
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
  const playLocalTrack = (track: Track) => {
    demoVideoRef.current?.pause();
    if (track.videoUrl) {
      globalAudioEngine.stop();
      setCurrentTime(0);
      setDuration(demoVideoRef.current && Number.isFinite(demoVideoRef.current.duration) ? demoVideoRef.current.duration : track.duration);
      const video = demoVideoRef.current;
      if (video) {
        video.currentTime = 0;
        video.volume = volume;
        void video.play().catch(() => setIsPlaying(false));
      }
    } else {
      globalAudioEngine.loadTrack(track, true);
      setCurrentTime(0);
      setDuration(track.duration);
    }
    setIsPlaying(true);
  };

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
    playLocalTrack(track);
  };

  const handlePrevTrack = () => {
    if (isUsingSpotify) {
      spotify.handleRemotePrev();
      return;
    }
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIdx);
    playLocalTrack(tracks[prevIdx]);
  };

  const handleNextTrack = () => {
    if (isUsingSpotify) {
      spotify.handleRemoteNext();
      return;
    }
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIdx);
    playLocalTrack(tracks[nextIdx]);
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

    if (isDemoVideo) {
      const video = demoVideoRef.current;
      if (isPlaying) video?.pause();
      else void video?.play().catch(() => setIsPlaying(false));
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
    if (isDemoVideo && demoVideoRef.current) demoVideoRef.current.currentTime = time;
    else globalAudioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    globalAudioEngine.setVolume(vol);
    if (demoVideoRef.current) demoVideoRef.current.volume = vol;
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
          { id: 'd-4', time: 18.0, text: 'VITROBOX V1 · 空间歌词视界', highlightWords: ['VITROBOX', 'V1'], layoutStyle: 'bottom_left' as const },
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
    }
  };

  const handleHaloEnter = () => {
    // Stay inside the trusted click for AudioContext.resume() and media.play().
    globalAudioEngine.playBassPulse();
    setEntryPulse(previous => previous + 1);
    if (isUsingSpotify) {
      if (!spotify.playbackState.isPlaying) spotify.handleRemotePlay();
    } else if (isDemoVideo) {
      const video = demoVideoRef.current;
      if (video) {
        video.volume = volume;
        void video.play().catch(() => setIsPlaying(false));
      }
    } else {
      globalAudioEngine.play();
    }
  };

  return (
    <div
      inert={isHaloLoaderVisible}
      aria-hidden={isHaloLoaderVisible || undefined}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleWindowDrop}
      className={`player-shell gemini-layout relative w-screen flex flex-col text-neutral-200 select-none ${isVisualConsoleOpen ? 'is-visual-open' : ''} ${isFullscreen ? 'is-preview-fullscreen' : ''}`}
      style={{ backgroundColor: pageBackground.color }}
    >
      <HalofluxLoader onEnter={handleHaloEnter} onVisibilityChange={setIsHaloLoaderVisible} />
      {/* ---------------- 1. TOP BAR CONTRACT ---------------- */}
      {!isFullscreen && (
        <header className="console-header flex items-center justify-between gap-8 px-6 md:px-10 py-3.5 border-b border-[#1f242d] bg-[#0e1014]/90 backdrop-blur-md z-30 shrink-0">
          {/* Brushed-metal identity plate */}
          <div className="vb-metal-nameplate" role="img" aria-label="VITROBOX — Reyno LAB">
            <span className="vb-plate-rivet tl" aria-hidden="true" />
            <span className="vb-plate-rivet tr" aria-hidden="true" />
            <span className="vb-plate-rivet bl" aria-hidden="true" />
            <span className="vb-plate-rivet br" aria-hidden="true" />
            <div className="vb-emblem-disc" aria-hidden="true" />
            <span className="vb-embossed-wordmark">VITROBOX</span>
            <span className="vb-etched-groove" aria-hidden="true" />
            <div className="vb-sunken-lab-tag">
              <span className="vb-lab-led" aria-hidden="true" />
              <span>Reyno LAB</span>
            </div>
          </div>

          {/* Primary actions */}
          <div className="console-actions flex items-center gap-3 shrink-0">
            {/* Spotify Connect Button */}
            <button
              onClick={() => setIsSpotifyModalOpen(true)}
              className={`console-spotify ${spotify.isPlaybackHealthy ? 'is-synced' : ''} flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-sm ${
                spotify.isPlaybackHealthy
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
                {spotify.isPlaybackHealthy
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

            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="console-contact flex items-center justify-center p-2 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
              title="联系 Reyno LAB"
              aria-label="联系方式"
            >
              <Mail className="w-4 h-4" />
            </button>

          </div>
        </header>
      )}

      {/* ---------------- 2. MAIN 16:9 VIEWPORT CONTAINER ---------------- */}
      <main className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        {/* ----------------- VITROBOX V1 SPEAKER SYSTEM (16:9 Ratio) ----------------- */}
        <GeminiPlayer
          entryPulse={entryPulse}
          mode={mode}
          onModeChange={handleModeChange}
          theme={theme}
          onThemeChange={handleAuraChange}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          bassMultiplier={bassMultiplier}
          onBassMultiplierChange={setBassMultiplier}
          isPlaying={activeIsPlaying}
          onTogglePlay={handleTogglePlay}
          currentTime={activeCurrentTime}
          lyrics={stageLyrics}
          particleSettings={particleSettings}
          onVisualSettingsChange={changeVisuals}
          externalPlayback={isUsingSpotify}
          trackTitle={activeTrack.title}
          trackArtist={activeTrack.artist}
          coverArt={customCovers[activeTrack.id] || activeTrack.coverArt}
          trackAlbum={activeTrack.album}
          tracks={tracks}
          onSelectTrack={handleSelectTrack}
          audioAnalysis={audioAnalysis}
          viewEnvironment={viewEnvironment}
          typographyStyle={typographyStyle}
          onTypographyStyleChange={setTypographyStyle}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          backgroundColor={pageBackground.color}
          backgroundGlow={pageBackground.glow}
          frameMaterial={FRAME_MATERIALS[frameMaterialIndex]}
          demoVideoUrl={isDemoVideo ? DEMO_VIDEO.url : undefined}
          demoVideoRef={demoVideoRef}
          onVideoTimeUpdate={event => { if (isDemoVideo) setCurrentTime(event.currentTarget.currentTime); }}
          onVideoLoadedMetadata={event => { if (isDemoVideo) setDuration(event.currentTarget.duration); }}
          onVideoPlay={() => { if (isDemoVideo) setIsPlaying(true); }}
          onVideoPause={() => { if (isDemoVideo) setIsPlaying(false); }}
          onVideoEnded={() => { if (isDemoVideo) setIsPlaying(false); }}
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
        theme={theme}
        onThemeChange={handleAuraChange}
        typographyStyle={typographyStyle}
        onTypographyStyleChange={setTypographyStyle}
        isSpotifySyncActive={spotify.isSyncActive}
        backgroundName={pageBackground.name}
        frameMaterial={FRAME_MATERIALS[frameMaterialIndex]}
        onNextFrameMaterial={() => setFrameMaterialIndex((index) => (index + 1) % FRAME_MATERIALS.length)}
        onNextBackground={() => setBackgroundIndex((index) => (index + 1) % PLAYER_BACKGROUNDS.length)}
        visualSettings={particleSettings}
        onVisualSettingsChange={changeVisuals}
        onOpenVisuals={() => setIsVisualConsoleOpen(true)}
        onCloseVisuals={() => setIsVisualConsoleOpen(false)}
        onOpenLyrics={() => setIsLyricsCorrectionOpen(true)}
        onOpenAudio={() => setIsUploadModalOpen(true)}
        bassMultiplier={bassMultiplier}
        onBassMultiplierChange={setBassMultiplier}
        onCoverChange={cover => setCustomCovers(previous => ({ ...previous, [activeTrack.id]: cover }))}
        visualConsole={isVisualConsoleOpen && (
          <VisualConsole
            settings={particleSettings}
            onSettingsChange={changeVisuals}
            onClose={() => setIsVisualConsoleOpen(false)}
            isPlaying={activeIsPlaying}
            onTogglePlayback={handleTogglePlay}
            trackTitle={activeTrack.title}
            audioSource={isUsingSpotify ? 'Spotify' : isDemoVideo ? '视频曲目' : '本地音频'}
            previewLyrics={currentDemo}
            onPreviewLyrics={lines => setDemoLyrics(lines?.length ? { trackId: activeTrack.id, lines } : null)}
          />
        )}
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
          setDemoLyrics(null);
          if (isUsingSpotify) {
            spotify.replaceCurrentSpotifyLyrics(lyrics);
            return;
          }
          setTracks((previous) => previous.map((track, index) =>
            index === currentTrackIndex ? { ...track, lyrics } : track
          ));
        }}
      />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
