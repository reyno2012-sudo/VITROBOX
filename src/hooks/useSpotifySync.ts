import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SpotifyUser,
  getSpotifyStatus,
  getSpotifyAuthUrl,
  logoutSpotify,
  getSpotifyPlayback,
  spotifyControl,
  getSpotifyLyrics,
  spotifyStorage,
  generatePkcePair,
  exchangePkceToken,
} from '../services/spotifyService';
import { Track, LyricLine } from '../types';
import { parseLrc } from '../utils/lrcParser';
import { globalAudioEngine } from '../utils/audioEngine';

export function useSpotifySync(onTrackChange?: (track: Track) => void) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [playbackState, setPlaybackState] = useState<{
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    deviceName?: string;
  }>({
    isPlaying: false,
    currentTime: 0,
    duration: 180,
  });

  const [currentSpotifyTrack, setCurrentSpotifyTrack] = useState<Track | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('未连接');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [lastAuthUrl, setLastAuthUrl] = useState<string | null>(null);

  // Millisecond lyric offset adjustment (-50ms, +50ms)
  const [lyricOffsetMs, setLyricOffsetMs] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('sp_lyric_offset_ms') || '0', 10);
    } catch {
      return 0;
    }
  });
  const lyricOffsetRef = useRef(lyricOffsetMs);
  lyricOffsetRef.current = lyricOffsetMs;

  const adjustLyricOffset = useCallback((deltaMs: number) => {
    setLyricOffsetMs((prev) => {
      const next = prev + deltaMs;
      try {
        localStorage.setItem('sp_lyric_offset_ms', String(next));
      } catch {}
      return next;
    });
  }, []);

  const resetLyricOffset = useCallback(() => {
    setLyricOffsetMs(0);
    try {
      localStorage.setItem('sp_lyric_offset_ms', '0');
    } catch {}
  }, []);

  // Cached track ID to avoid re-fetching lyrics repeatedly
  const lastTrackIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const baseTimeRef = useRef<{ serverTime: number; timestamp: number }>({
    serverTime: 0,
    timestamp: performance.now(),
  });
  const isPlayingRef = useRef(false);

  // Check initial auth status and handle PKCE ?code= on mount
  useEffect(() => {
    checkAuthStatus();

    // Check if redirected back with PKCE code
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        const verifier = localStorage.getItem('sp_code_verifier');
        const clientId = localStorage.getItem('sp_client_id');
        if (verifier && clientId) {
          setIsLoadingAuth(true);
          const redirectUri = `${window.location.origin}/auth/callback`;
          exchangePkceToken(clientId, code, verifier, redirectUri)
            .then((data) => {
              setIsAuthenticated(true);
              setIsSyncActive(true);
              if (data.user) setUser(data.user);
              setStatusMessage('Spotify PKCE 直连已成功建立！');
              window.history.replaceState({}, document.title, window.location.pathname);
              checkAuthStatus();
            })
            .catch((err) => {
              console.warn('PKCE redirect token exchange error:', err);
              window.history.replaceState({}, document.title, window.location.pathname);
            })
            .finally(() => {
              setIsLoadingAuth(false);
            });
        }
      }
    } catch (e) {
      console.warn('Error checking PKCE redirect query:', e);
    }

    // Listen for postMessage from OAuth popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          spotifyStorage.setToken(event.data.token);
        }
        if (event.data.user) {
          setUser(event.data.user);
        }
        setIsAuthenticated(true);
        setIsSyncActive(true);
        setStatusMessage('已连接 Spotify');
        checkAuthStatus();
      } else if (event.data?.type === 'SPOTIFY_PKCE_CODE' && event.data.code) {
        const code = event.data.code;
        const verifier = localStorage.getItem('sp_code_verifier') || '';
        const clientId = localStorage.getItem('sp_client_id');
        const redirectUri = `${window.location.origin}/auth/callback`;

        if (!clientId) {
          setStatusMessage('授权信息已失效，请重新填写您自己的 Spotify Client ID');
          return;
        }

        setIsLoadingAuth(true);
        setStatusMessage('正在验证 Spotify 授权令牌...');
        try {
          const data = await exchangePkceToken(clientId, code, verifier, redirectUri);
          setIsAuthenticated(true);
          setIsSyncActive(true);
          if (data.user) setUser(data.user);
          setStatusMessage('Spotify 直连已成功建立！');
          await checkAuthStatus();
        } catch (err: any) {
          console.error('PKCE exchange failed:', err);
          setStatusMessage(`授权令牌交换失败: ${err.message || '请重试'}`);
        } finally {
          setIsLoadingAuth(false);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setStatusMessage(`授权失败: ${event.data.error || '未知错误'}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await getSpotifyStatus();
      setIsAuthenticated(status.authenticated);
      if (status.authenticated && status.user) {
        setUser(status.user);
        setStatusMessage(`已连接: ${status.user.displayName}`);
        setIsSyncActive(true);
      } else {
        setUser(null);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  // PKCE Direct Connect (No Client Secret required, popup/new tab safe for iframes)
  const connectSpotifyPkce = async (customClientId?: string) => {
    setIsLoadingAuth(true);
    try {
      const clientId = (customClientId || '').trim();
      if (!clientId) {
        throw new Error('请输入您自己的 Spotify Client ID');
      }
      localStorage.setItem('sp_client_id', clientId);

      const { verifier, challenge } = await generatePkcePair();
      localStorage.setItem('sp_code_verifier', verifier);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scopes = [
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-email',
        'user-read-private',
      ].join(' ');

      const authUrl =
        'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          scope: scopes,
          redirect_uri: redirectUri,
          code_challenge_method: 'S256',
          code_challenge: challenge,
        }).toString();

      setLastAuthUrl(authUrl);

      // Open in popup window (DO NOT navigate iframe directly, as Spotify sends X-Frame-Options: DENY)
      const width = 520;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'SpotifyAuthPopup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );

      if (!popup) {
        setStatusMessage('浏览器拦截了弹窗，请点击“在新窗口打开”或在地址栏允许弹窗');
      } else {
        setStatusMessage('已打开 Spotify 授权窗口，请在弹窗中点击“同意”');
      }
      return authUrl;
    } catch (err: any) {
      setStatusMessage(err.message || '启动 PKCE 授权失败');
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Login popup flow
  const connectSpotify = async (credentials?: { clientId?: string; clientSecret?: string }) => {
    setIsLoadingAuth(true);
    try {
      const { url } = await getSpotifyAuthUrl(credentials);
      
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'SpotifyAuthPopup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );

      if (!popup) {
        alert('请允许弹出窗口以便完成 Spotify 授权登录');
      }
    } catch (err: any) {
      setStatusMessage(err.message || '启动授权失败');
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const disconnectSpotify = async () => {
    await logoutSpotify();
    localStorage.removeItem('sp_access_token');
    localStorage.removeItem('sp_refresh_token');
    localStorage.removeItem('sp_code_verifier');
    setIsAuthenticated(false);
    setUser(null);
    setIsSyncActive(false);
    setCurrentSpotifyTrack(null);
    lastTrackIdRef.current = null;
    setStatusMessage('已断开连接');
    globalAudioEngine.setExternalPlayback(false);
  };

  // Fetch current playback and update synced state with RTT latency compensation
  const pollPlayback = useCallback(async (): Promise<{
    success: boolean;
    track: Track | null;
    message?: string;
    isPremiumRestricted?: boolean;
    isUserNotRegistered?: boolean;
    suggestedTrack?: any;
  }> => {
    if (!isAuthenticated) {
      return { success: false, track: null, message: '请先登录并授权 Spotify' };
    }

    try {
      const fetchStart = performance.now();
      const data = await getSpotifyPlayback();
      const fetchEnd = performance.now();

      // RTT dynamic latency compensation (RTT/2) + User Offset
      const rtt = fetchEnd - fetchStart;
      const networkLatencySec = Math.min(Math.max(rtt / 2 / 1000, 0), 0.35);

      const track = data.track;
      const isPlaying = data.isPlaying;
      const progressSec =
        (data.progressMs || 0) / 1000 +
        (isPlaying ? networkLatencySec : 0) +
        lyricOffsetRef.current / 1000;
      const durationSec = (data.durationMs || 180000) / 1000;

      isPlayingRef.current = isPlaying;
      baseTimeRef.current = {
        serverTime: progressSec,
        timestamp: performance.now(),
      };

      setPlaybackState({
        isPlaying,
        currentTime: progressSec,
        duration: durationSec,
        deviceName: data.device?.name,
      });

      // Synchronize audio engine visualization diaphragm
      globalAudioEngine.setExternalPlayback(isPlaying, 120);

      if (data.isUserNotRegistered) {
        setStatusMessage('未在开发者后台登记白名单: 请在 User Management 中添加当前 Spotify 账号邮箱');
        return {
          success: false,
          track: null,
          isUserNotRegistered: true,
          suggestedTrack: data.suggestedTrack,
          message:
            'Spotify 开发者后台限制：开发模式下需在 Dashboard -> Settings -> User Management 添加当前 Spotify 账号邮箱。已为您准备了一键同步《Candy Says》！',
        };
      }

      if (data.isPremiumRestricted) {
        setStatusMessage('Spotify API 限制：应用所有者需开通 Premium，推荐一键同步下方曲目');
        return {
          success: false,
          track: null,
          isPremiumRestricted: true,
          suggestedTrack: data.suggestedTrack,
          message: 'Spotify API 提示：开发者应用账号需开通 Premium。支持一键直达同步！',
        };
      }

      if (!track) {
        setStatusMessage(
          data.device
            ? `设备在线: ${data.device.name} (等待播放)`
            : '已连接 Spotify · 请在 Spotify App 或网页端播放任意曲目'
        );
        return {
          success: false,
          track: null,
          suggestedTrack: data.suggestedTrack,
          message: 'Spotify 当前无活跃播放。请在 Spotify 点击播放或选择下方曲目一键同步',
        };
      }

      setStatusMessage(`正在同步: ${track.title} - ${track.artist}`);

      // If track changed or first load, fetch synced lyrics
      if (track.id !== lastTrackIdRef.current) {
        lastTrackIdRef.current = track.id;

        const newTrack: Track = {
          id: `spotify-${track.id}`,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: durationSec,
          coverArt: track.albumArt,
          lyrics: [],
        };
        setCurrentSpotifyTrack({ ...newTrack });

        try {
          const result = await getSpotifyLyrics(track.title, track.artist, durationSec);
          if (result.syncedLyrics) {
            newTrack.lyrics = parseLrc(result.syncedLyrics, result.transLyrics).lines;
          } else if (result.plainLyrics?.trim()) {
            newTrack.lyrics = [{ id: 'plain', time: 0, text: result.plainLyrics.trim() }];
          }
        } catch (error) {
          console.warn('Lyrics fetch failed:', error);
        }

        if (lastTrackIdRef.current !== track.id) {
          return { success: false, track: null, message: 'Spotify 曲目已切换' };
        }

        setCurrentSpotifyTrack(newTrack);
        if (onTrackChange) {
          onTrackChange(newTrack);
        }
        return { success: true, track: newTrack, message: `已成功同步：${track.title}` };
      }

      return { success: true, track: currentSpotifyTrack, message: `正在播放：${track.title}` };
    } catch (err: any) {
      console.warn('Playback poll error:', err);
      try {
        const s = await getSpotifyStatus();
        if (!s.authenticated) {
          setIsAuthenticated(false);
          setStatusMessage('Spotify 认证已失效，请重新连接');
        } else {
          setStatusMessage('正在重新获取 Spotify 播放数据...');
        }
      } catch {
        setStatusMessage('正在连接 Spotify...');
      }
      return { success: false, track: null, message: err.message || '获取播放状态失败' };
    }
  }, [isAuthenticated, onTrackChange, currentSpotifyTrack]);

  // Direct track sync with lyrics (e.g. Candy Says or search results)
  const syncTrackDirectly = useCallback(
    async (trackData: {
      title: string;
      artist: string;
      album?: string;
      albumArt?: string;
      duration?: number;
      audioUrl?: string;
    }): Promise<Track> => {
      const durationSec = trackData.duration || 243;
      let lyrics: LyricLine[] = [];

      try {
        const lyricsRes = await getSpotifyLyrics(trackData.title, trackData.artist, durationSec);
        if (lyricsRes.syncedLyrics) {
          lyrics = parseLrc(lyricsRes.syncedLyrics, lyricsRes.transLyrics).lines;
        } else if (lyricsRes.plainLyrics) {
          const lines = lyricsRes.plainLyrics.split('\n').filter((l) => l.trim().length > 0);
          const step = Math.max(3, durationSec / (lines.length + 1));
          lyrics = lines.map((text, idx) => ({
            id: `plain-${idx}`,
            time: idx * step,
            text: text.trim(),
            layoutStyle: idx % 2 === 0 ? 'top_right' : 'bottom_left',
          }));
        }
      } catch (err) {
        console.warn('Lyrics fetch failed in direct sync:', err);
      }

      if (lyrics.length === 0) {
        lyrics = [
          {
            id: 'sync-1',
            time: 0,
            text: trackData.title.toUpperCase(),
            highlightWords: [trackData.title.split(' ')[0] || 'TRACK'],
            layoutStyle: 'bottom_left',
          },
          {
            id: 'sync-2',
            time: 4,
            text: `${trackData.artist} · ${trackData.album || 'SPOTIFY DIRECT'}`,
            highlightWords: [trackData.artist],
            layoutStyle: 'top_right',
          },
          {
            id: 'sync-3',
            time: 10,
            text: 'SPOTIFY LIVE SYNC · VITROBOX',
            highlightWords: ['SPOTIFY', 'VITROBOX'],
            layoutStyle: 'bottom_left',
          },
        ];
      }

      const newTrack: Track = {
        id: `spotify-direct-${Date.now()}`,
        title: trackData.title,
        artist: trackData.artist,
        album: trackData.album || 'Spotify Direct Sync',
        duration: durationSec,
        coverArt: trackData.albumArt || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
        audioUrl: trackData.audioUrl,
        lyrics,
      };

      lastTrackIdRef.current = newTrack.id;
      setCurrentSpotifyTrack(newTrack);
      setIsSyncActive(true);
      setStatusMessage(`已同步 Spotify 曲目: ${newTrack.title} - ${newTrack.artist}`);

      setPlaybackState({
        isPlaying: true,
        currentTime: 0,
        duration: durationSec,
        deviceName: 'Spotify Web Player',
      });

      isPlayingRef.current = true;
      baseTimeRef.current = {
        serverTime: 0,
        timestamp: performance.now(),
      };

      globalAudioEngine.setExternalPlayback(true, 120);

      if (onTrackChange) {
        onTrackChange(newTrack);
      }

      return newTrack;
    },
    [onTrackChange]
  );

  // Polling loop
  useEffect(() => {
    if (isSyncActive && isAuthenticated) {
      pollPlayback();
      pollTimerRef.current = window.setInterval(pollPlayback, 1200);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      globalAudioEngine.setExternalPlayback(false);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isSyncActive, isAuthenticated, pollPlayback]);

  // Smooth 60fps high-precision time interpolation between 1.2s poll intervals
  useEffect(() => {
    if (!isSyncActive) return;

    const smoothStep = () => {
      if (isPlayingRef.current) {
        const elapsed = (performance.now() - baseTimeRef.current.timestamp) / 1000;
        const interpolated = baseTimeRef.current.serverTime + elapsed;
        setPlaybackState((prev) => ({
          ...prev,
          currentTime: Math.min(prev.duration, interpolated),
        }));
      }
      animationFrameRef.current = requestAnimationFrame(smoothStep);
    };

    animationFrameRef.current = requestAnimationFrame(smoothStep);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isSyncActive]);

  // Remote player controls
  const handleRemotePlay = async () => {
    await spotifyControl('play');
    pollPlayback();
  };

  const handleRemotePause = async () => {
    await spotifyControl('pause');
    pollPlayback();
  };

  const handleRemoteNext = async () => {
    await spotifyControl('next');
    setTimeout(pollPlayback, 400);
  };

  const handleRemotePrev = async () => {
    await spotifyControl('prev');
    setTimeout(pollPlayback, 400);
  };

  const handleRemoteSeek = async (seconds: number) => {
    await spotifyControl('seek', { positionMs: Math.round(seconds * 1000) });
    baseTimeRef.current = {
      serverTime: seconds,
      timestamp: performance.now(),
    };
    setPlaybackState((prev) => ({ ...prev, currentTime: seconds }));
  };

  const replaceCurrentSpotifyLyrics = useCallback((lyrics: LyricLine[]) => {
    setCurrentSpotifyTrack((track) => track ? { ...track, lyrics } : track);
  }, []);

  return {
    isAuthenticated,
    user,
    isSyncActive,
    setIsSyncActive,
    statusMessage,
    isLoadingAuth,
    currentSpotifyTrack,
    playbackState,
    connectSpotify,
    connectSpotifyPkce,
    disconnectSpotify,
    lyricOffsetMs,
    adjustLyricOffset,
    resetLyricOffset,
    handleRemotePlay,
    handleRemotePause,
    handleRemoteNext,
    handleRemotePrev,
    handleRemoteSeek,
    replaceCurrentSpotifyLyrics,
    pollPlayback,
    syncTrackDirectly,
    lastAuthUrl,
  };
}
