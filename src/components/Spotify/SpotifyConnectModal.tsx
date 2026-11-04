import React, { useState, useEffect } from 'react';
import { getSpotifyConfig, getSpotifyDiagnose } from '../../services/spotifyService';
import { SpotifyUser } from '../../services/spotifyService';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Key,
  LogOut,
  Radio,
  Sparkles,
  X,
  Music,
  RefreshCw,
  Search,
  Play,
  Loader2,
  AlertCircle,
  Headphones,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { searchMusicTracks, TrackSearchResult } from '../../services/spotifyService';

interface SpotifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  isSyncActive: boolean;
  onToggleSync: (active: boolean) => void;
  onConnect: (credentials?: { clientId?: string; clientSecret?: string }) => Promise<void>;
  onConnectPkce?: (clientId?: string) => Promise<any>;
  onDisconnect: () => Promise<void>;
  statusMessage: string;
  currentTrackTitle?: string;
  currentArtist?: string;
  onSyncNow?: () => Promise<any> | void;
  onSyncTrackDirectly?: (trackData: {
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    duration?: number;
    audioUrl?: string;
  }) => Promise<any> | void;
  lyricOffsetMs?: number;
  onAdjustOffset?: (deltaMs: number) => void;
  onResetOffset?: () => void;
  lastAuthUrl?: string | null;
}

export function SpotifyConnectModal({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  isSyncActive,
  onToggleSync,
  onConnect,
  onConnectPkce,
  onDisconnect,
  statusMessage,
  currentTrackTitle,
  currentArtist,
  onSyncNow,
  onSyncTrackDirectly,
  lyricOffsetMs = 0,
  onAdjustOffset,
  onResetOffset,
  lastAuthUrl,
}: SpotifyConnectModalProps) {
  const [config, setConfig] = useState<{
    configured: boolean;
    redirectUri: string;
  }>({
    configured: false,
    redirectUri: 'https://ais-dev-d2ql7x3ykbs6f7j7w4lcjx-225925733543.us-east1.run.app/auth/callback',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Never prefill or publish an application owner's Client ID. Every visitor
  // must explicitly provide the ID from their own Spotify Developer app.
  const [pkceClientId, setPkceClientId] = useState('');
  const [pkceCopied, setPkceCopied] = useState(false);
  const currentAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : config.redirectUri;

  const handleCopyCurrentUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setPkceCopied(true);
    setTimeout(() => setPkceCopied(false), 2000);
  };

  const handlePkceSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pkceClientId.trim()) {
      setErrorMessage('请输入 Spotify Client ID');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (onConnectPkce) {
        await onConnectPkce(pkceClientId.trim());
      } else {
        await onConnect();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'PKCE 直连失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePkceReauthorize = async () => {
    const savedClientId = localStorage.getItem('sp_client_id')?.trim();
    if (!savedClientId || !onConnectPkce) {
      setErrorMessage('请先退出连接，然后重新填写您自己的 Spotify Client ID');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onConnectPkce(savedClientId);
    } catch (err: any) {
      setErrorMessage(err.message || '重新授权失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    suggestedTrack?: any;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [diagnoseData, setDiagnoseData] = useState<Record<string, any> | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showDiagnose, setShowDiagnose] = useState(false);

  const handleRunDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      const data = await getSpotifyDiagnose();
      setDiagnoseData(data);
      setShowDiagnose(true);
    } catch (err: any) {
      setDiagnoseData({ error: err.message || '诊断失败' });
      setShowDiagnose(true);
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      getSpotifyConfig()
        .then(setConfig)
        .catch((err) => console.warn('Failed to load Spotify config:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(config.redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Immediate sync click with loading & feedback
  const handleSyncClick = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      if (onSyncNow) {
        const res = await onSyncNow();
        if (res && res.success && res.track) {
          setSyncFeedback({
            type: 'success',
            message: `✓ 成功抓取 Spotify 曲目：${res.track.title} - ${res.track.artist}`,
          });
        } else if (res && res.isUserNotRegistered) {
          setSyncFeedback({
            type: 'warning',
            message:
              '⚠️ Spotify 白名单限制：由于 Spotify App 处于开发模式，请在 developer.spotify.com 的 Settings -> User Management 添加当前 Spotify 账号邮箱，然后点击【重新授权】。下方已准备好《Candy Says》，可直接点击【立即同步播放】！',
            suggestedTrack: res.suggestedTrack,
          });
        } else if (res && res.isPremiumRestricted) {
          setSyncFeedback({
            type: 'warning',
            message:
              'Spotify API 提示：此应用开发者账号需 Spotify Premium。已为您准备了一键同步《Candy Says - The Velvet Underground》，点按即可同步！',
            suggestedTrack: res.suggestedTrack,
          });
        } else {
          setSyncFeedback({
            type: 'warning',
            message:
              'Spotify 当前未检测到活跃播放。请在 Spotify 网页或客户端播放歌曲，或使用下方【一键直达同步】！',
            suggestedTrack: res?.suggestedTrack || {
              title: 'Candy Says',
              artist: 'The Velvet Underground',
              album: 'The Velvet Underground',
              duration: 243.6,
              albumArt:
                'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/33/98/39/3398391b-3586-0903-a094-423c93d8fe53/00602547075031.rgb.jpg/600x600bb.jpg',
              audioUrl:
                'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7f/a9/6f/7fa96fe6-861c-9d4a-731f-494eb5fe9b12/mzaf_15072715139268820405.plus.aac.p.m4a',
            },
          });
        }
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || '抓取失败，请点击下方快捷卡片进行直达同步',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick sync any specific track
  const handleQuickSync = async (trackData: {
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    duration?: number;
    audioUrl?: string;
  }) => {
    setIsSyncing(true);
    try {
      if (onSyncTrackDirectly) {
        await onSyncTrackDirectly(trackData);
        setSyncFeedback({
          type: 'success',
          message: `✓ 已成功同步《${trackData.title} - ${trackData.artist}》并载入先锋动态歌词！`,
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || '同步失败',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Music search handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMusicTracks(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-[#121418] border border-[#262c37] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202530] bg-[#161a22]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
              <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">Spotify 实时曲库同步</h2>
              <p className="text-[11px] text-[#8e98a5]">
                {isAuthenticated ? '已连接授权 · 实时获取歌曲与歌词' : '登录 Spotify 获取正在播放曲目及歌词'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8e98a5] hover:text-white hover:bg-[#202530] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {isAuthenticated ? (
            /* ================= CONNECTED STATE ================= */
            <div className="space-y-5">
              {/* User Profile Card */}
              <div className="flex items-center justify-between p-4 bg-[#191d26] border border-[#29303d] rounded-xl">
                <div className="flex items-center gap-3.5">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full border border-[#1DB954]/50 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#252b36] flex items-center justify-center text-white font-bold border border-[#3b4455]">
                      {user?.displayName?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{user?.displayName || 'Spotify 用户'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] font-mono uppercase tracking-wider">
                        {user?.product || 'Connected'}
                      </span>
                    </div>
                    <span className="text-xs text-[#8e98a5]">{user?.email || 'Spotify 官方账号'}</span>
                  </div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出登录</span>
                </button>
              </div>

              {/* Sync Toggle Status */}
              <div className="p-4 bg-[#161a22] border border-[#242b37] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Radio className={`w-4 h-4 ${isSyncActive ? 'text-[#1DB954] animate-pulse' : 'text-[#8e98a5]'}`} />
                    <span className="text-xs font-medium text-white">实时无感同步状态</span>
                  </div>
                  <button
                    onClick={() => onToggleSync(!isSyncActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      isSyncActive ? 'bg-[#1DB954]' : 'bg-[#2b3341]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isSyncActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="text-xs text-[#9aa4b2] flex items-center justify-between pt-1 border-t border-[#232936]">
                  <span>状态指示</span>
                  <span className="font-mono text-neutral-300">{statusMessage}</span>
                </div>

                {/* Manual Sync & Reconnect Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#232936]">
                  <button
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] hover:text-white border border-[#1DB954]/40 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
                        <span>正在抓取 Spotify...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>立即抓取 Spotify 播放曲目</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePkceReauthorize}
                    disabled={isSyncing || isSubmitting}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#242b37] hover:bg-[#313a4a] text-neutral-300 hover:text-white border border-[#3b4556] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>重新授权</span>
                  </button>
                  <button
                    onClick={handleRunDiagnose}
                    disabled={isDiagnosing}
                    title="调用 /api/spotify/diagnose 诊断 Spotify 接口返回"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1e2330] hover:bg-[#2b3244] text-cyan-300 hover:text-cyan-100 border border-cyan-800/40 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDiagnosing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>接口诊断</span>
                  </button>
                </div>

                {/* Spotify Diagnostic Inspector Panel */}
                {showDiagnose && (
                  <div className="p-3 bg-[#0d1017] rounded-xl border border-cyan-900/50 space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-cyan-400 font-semibold">
                        <Activity className="w-3.5 h-3.5" />
                        <span>/api/spotify/diagnose 诊断返回</span>
                      </div>
                      <button
                        onClick={() => setShowDiagnose(false)}
                        className="text-[11px] text-neutral-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
                      >
                        收起
                      </button>
                    </div>

                    {diagnoseData?.error ? (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 font-mono text-[11px]">
                        {diagnoseData.error}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 font-mono text-[11px]">
                        {/* /me */}
                        <div className="p-2 bg-[#141822] rounded-lg border border-[#222a3a]">
                          <div className="flex items-center justify-between text-neutral-300">
                            <span className="font-bold text-white">GET /v1/me</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                diagnoseData?.['/me']?.status === 200
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              HTTP {diagnoseData?.['/me']?.status ?? '—'}
                            </span>
                          </div>
                          {diagnoseData?.['/me']?.user && (
                            <div className="text-neutral-400 text-[10px] mt-1 space-y-0.5">
                              <div>用户 ID: <span className="text-white">{diagnoseData['/me'].user.id}</span></div>
                              <div>会员类型: <span className="text-emerald-400">{diagnoseData['/me'].user.product || 'free'}</span></div>
                            </div>
                          )}
                          {diagnoseData?.['/me']?.error && (
                            <div className="text-rose-400 text-[10px] mt-1">
                              {JSON.stringify(diagnoseData['/me'].error)}
                            </div>
                          )}
                        </div>

                        {/* /me/player/devices */}
                        <div className="p-2 bg-[#141822] rounded-lg border border-[#222a3a]">
                          <div className="flex items-center justify-between text-neutral-300">
                            <span className="font-bold text-white">GET /v1/me/player/devices</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                diagnoseData?.['/me/player/devices']?.status === 200
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              HTTP {diagnoseData?.['/me/player/devices']?.status ?? '—'}
                            </span>
                          </div>
                          <div className="text-neutral-400 text-[10px] mt-1">
                            {Array.isArray(diagnoseData?.['/me/player/devices']?.devices) &&
                            diagnoseData['/me/player/devices'].devices.length > 0 ? (
                              <div className="space-y-0.5">
                                {diagnoseData['/me/player/devices'].devices.map((d: any, idx: number) => (
                                  <div key={idx} className="text-emerald-300">
                                    • {d.name} ({d.type}) - {d.is_active ? '正在播放' : '待机'}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-neutral-500">未检测到活跃设备（请在手机/电脑打开 Spotify 播放）</span>
                            )}
                          </div>
                          {diagnoseData?.['/me/player/devices']?.error && (
                            <div className="text-rose-400 text-[10px] mt-1">
                              {JSON.stringify(diagnoseData['/me/player/devices'].error)}
                            </div>
                          )}
                        </div>

                        {/* /me/player */}
                        <div className="p-2 bg-[#141822] rounded-lg border border-[#222a3a]">
                          <div className="flex items-center justify-between text-neutral-300">
                            <span className="font-bold text-white">GET /v1/me/player</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                diagnoseData?.['/me/player']?.status === 200
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-neutral-600/30 text-neutral-400'
                              }`}
                            >
                              HTTP {diagnoseData?.['/me/player']?.status ?? '—'}
                            </span>
                          </div>
                          <div className="text-neutral-400 text-[10px] mt-1">
                            {diagnoseData?.['/me/player']?.isPlaying ? (
                              <span className="text-emerald-400">正在播放中 (Track ID: {diagnoseData['/me/player'].trackId})</span>
                            ) : (
                              <span className="text-neutral-500">当前未在播放或未激活播放器</span>
                            )}
                          </div>
                          {diagnoseData?.['/me/player']?.error && (
                            <div className="text-rose-400 text-[10px] mt-1">
                              {JSON.stringify(diagnoseData['/me/player'].error)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Interactive Feedback / Alert */}
                {syncFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 animate-in fade-in duration-200 ${
                      syncFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : syncFeedback.type === 'warning'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {syncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    )}
                    <div className="flex-1 leading-relaxed">{syncFeedback.message}</div>
                  </div>
                )}

                {/* Current Active Track Card */}
                {currentTrackTitle && (
                  <div className="flex items-center gap-3 p-3 bg-[#111317] rounded-lg border border-[#1e232e]">
                    <Music className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-white truncate">{currentTrackTitle}</p>
                      <p className="text-[11px] text-[#8e98a5] truncate">{currentArtist}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Timing Calibration & Multi-Source Engine (WebLyricFlow Style) */}
              <div className="p-4 bg-[#151922] border border-[#232b38] rounded-xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#fecc11]" />
                    <span className="text-xs font-semibold text-white">歌词多源聚合与时间轴微调</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                    网易云 · QQ音乐 · LRCLIB
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#202735] text-xs">
                  <div className="text-[#8e98a5]">
                    <span className="text-white font-medium">时间轴延迟微调</span>
                    <p className="text-[10px] text-[#647184]">精准微调动态歌词对齐 (±50ms)</p>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => onAdjustOffset && onAdjustOffset(-50)}
                      className="px-2.5 py-1.5 bg-[#202530] hover:bg-[#2c3342] text-neutral-200 border border-[#333c4d] rounded-lg text-xs font-bold cursor-pointer active:scale-95 transition-all"
                      title="提前 50ms"
                    >
                      -50
                    </button>
                    <div className="min-w-16 px-2.5 py-1.5 bg-[#0f1117] border border-[#293241] rounded-lg text-center text-xs font-bold text-amber-300">
                      {lyricOffsetMs > 0 ? `+${lyricOffsetMs}` : lyricOffsetMs} ms
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdjustOffset && onAdjustOffset(50)}
                      className="px-2.5 py-1.5 bg-[#202530] hover:bg-[#2c3342] text-neutral-200 border border-[#333c4d] rounded-lg text-xs font-bold cursor-pointer active:scale-95 transition-all"
                      title="延后 50ms"
                    >
                      +50
                    </button>
                    {lyricOffsetMs !== 0 && onResetOffset && (
                      <button
                        type="button"
                        onClick={onResetOffset}
                        className="px-2 py-1.5 bg-[#1a1e28] hover:bg-[#252b38] text-[10px] text-neutral-400 hover:text-white rounded-lg border border-[#2b3342] cursor-pointer"
                      >
                        归零
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Developer Mode User Management Notice */}
              {(!user || user.id === 'unknown' || syncFeedback?.type === 'warning') && (
                <div className="p-4 bg-[#1b170e] border border-amber-500/40 rounded-xl space-y-2.5 text-xs text-amber-200 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>开通 Premium 后仍未抓取的原因与解决办法</span>
                    </div>
                    <a
                      href="https://developer.spotify.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-white underline font-mono cursor-pointer"
                    >
                      <span>前往开发者后台</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Spotify 官方开发模式（Development Mode）强制要求：所有调用 API 账号必须在 App 的 <strong>User Management</strong> 中登记白名单。
                  </p>
                  <div className="text-[11px] text-amber-100/90 bg-black/40 p-3 rounded-lg space-y-1.5 font-sans border border-amber-500/20">
                    <div><strong>第 1 步：</strong>在浏览器打开 <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="underline text-emerald-400 font-mono">developer.spotify.com/dashboard</a></div>
                    <div><strong>第 2 步：</strong>点击应用 <strong>VITROBOX</strong> ➔ 右上角 <strong>Settings</strong></div>
                    <div><strong>第 3 步：</strong>点击左侧 <strong>User Management</strong>（用户管理）</div>
                    <div><strong>第 4 步：</strong>点击 <strong>Add user</strong>，填入名字和<strong>开通 Premium 的 Spotify 账号邮箱</strong>保存</div>
                    <div><strong>第 5 步：</strong>回到本界面点击上方【重新授权】即可完成完全自动同步！</div>
                  </div>
                  <div className="text-[10px] text-amber-300/80 pt-1 flex items-center justify-between border-t border-amber-500/20">
                    <span>💡 提示：无需等待白名单，可直接点击下方绿色按钮立即同步播放《Candy Says》！</span>
                  </div>
                </div>
              )}

              {/* Special Quick Match Card: The Velvet Underground - Candy Says (From User Spotify Screen) */}
              <div className="p-4 bg-gradient-to-r from-[#14231b] to-[#12161f] border border-[#1DB954]/40 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-[#1DB954]" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      正在播放智能识别 (Spotify 截图曲目)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/25 text-[#1DB954] font-medium border border-[#1DB954]/30">
                    一键直达
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src="https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/33/98/39/3398391b-3586-0903-a094-423c93d8fe53/00602547075031.rgb.jpg/600x600bb.jpg"
                    alt="Candy Says"
                    className="w-13 h-13 rounded-lg object-cover border border-[#1DB954]/30 shrink-0 shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">Candy Says</p>
                    <p className="text-xs text-[#8e98a5] truncate">The Velvet Underground · 4:03</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>已配对 LRCLIB 先锋时间戳歌词</span>
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleQuickSync({
                        title: 'Candy Says',
                        artist: 'The Velvet Underground',
                        album: 'The Velvet Underground',
                        duration: 243.6,
                        albumArt:
                          'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/33/98/39/3398391b-3586-0903-a094-423c93d8fe53/00602547075031.rgb.jpg/600x600bb.jpg',
                        audioUrl:
                          'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7f/a9/6f/7fa96fe6-861c-9d4a-731f-494eb5fe9b12/mzaf_15072715139268820405.plus.aac.p.m4a',
                      })
                    }
                    disabled={isSyncing}
                    className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-lg transition-all shadow-lg shadow-[#1DB954]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>立即同步播放</span>
                  </button>
                </div>
              </div>

              {/* Music Search & Fast Sync */}
              <div className="p-4 bg-[#161a22] border border-[#242b37] rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#38bdf8]" />
                  <span className="text-xs font-semibold text-white">快速检索 Spotify 歌曲同步</span>
                </div>
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="输入歌曲名、歌手 (例如: Candy Says, 王菲, Blinding Lights)..."
                    className="flex-1 px-3 py-2 bg-[#0f1115] border border-[#2b3341] rounded-lg text-xs text-white placeholder-[#606a78] focus:outline-none focus:border-[#1DB954]"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-3.5 py-2 bg-[#252b36] hover:bg-[#333b49] text-white border border-[#3b4455] rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>检索</span>
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2 border-t border-[#232936]">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#111317] hover:bg-[#191d26] border border-[#1f242e] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.albumArt ? (
                            <img src={item.albumArt} alt={item.title} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <Music className="w-8 h-8 p-2 rounded bg-neutral-800 text-neutral-400" />
                          )}
                          <div className="truncate">
                            <p className="text-xs font-medium text-white truncate">{item.title}</p>
                            <p className="text-[10px] text-[#8e98a5] truncate">{item.artist}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuickSync(item)}
                          disabled={isSyncing}
                          className="px-2.5 py-1 text-[11px] font-medium text-[#1DB954] hover:text-white bg-[#1DB954]/15 hover:bg-[#1DB954]/30 border border-[#1DB954]/30 rounded transition-colors cursor-pointer shrink-0"
                        >
                          同步
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Features summary */}
              <div className="grid grid-cols-2 gap-3 text-xs text-[#8e98a5]">
                <div className="p-3 bg-[#161a22] border border-[#202530] rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">全景歌词同步</p>
                    <p className="text-[11px] text-[#717b88]">通过 LRCLIB 自动精准获取时间戳，先锋排版浮现</p>
                  </div>
                </div>
                <div className="p-3 bg-[#161a22] border border-[#202530] rounded-xl flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">声学物理联动</p>
                    <p className="text-[11px] text-[#717b88]">双悬浮环形喇叭与玻璃水箱随律动实时起伏</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= NOT CONNECTED STATE (WebLyricFlow Style PKCE Direct Connect) ================= */
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-[#fecc11]/15 text-[#fecc11] border border-[#fecc11]/30">
                  Spotify 实时同步配置指南 · 免密钥极简直连
                </span>
                <p className="text-xs text-[#8e98a5] pt-1">
                  使用您自己的 Spotify 开发者应用 · 无需填写 Client Secret
                </p>
              </div>

              {/* 5-Step Visual Tutorial Card */}
              <div className="p-4 bg-[#181c25] border border-[#2b3342] rounded-2xl space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#242c3b] pb-2.5">
                  <span className="font-bold text-white tracking-wide">5 步获取 Client ID 配置教程</span>
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#fecc11] hover:underline font-mono"
                  >
                    <span>Spotify 开发者中心</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2.5 text-neutral-300 text-[11px] leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#252b38] text-neutral-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <div>打开 <strong className="text-amber-300">Spotify 网站</strong> 登录您的账号。</div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#252b38] text-neutral-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <div>进入 <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-amber-300 underline font-medium">开发者中心 (Dashboard)</a> 点击 Create App 创建应用。</div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#252b38] text-neutral-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <div>填写 App name 与 description（例如填 VITROBOX）。</div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#252b38] text-neutral-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                    <div className="flex-1 min-w-0">
                      <div>
                        勾选 <code className="text-amber-200">Web API</code>，将下方<strong className="text-white">自动生成的回调地址</strong>复制到 Spotify 后台的 <strong className="text-white">Redirect URIs</strong>。无需在 VITROBOX 内手动填写。
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 p-2 bg-black/60 border border-[#2b3342] rounded-lg">
                        <code className="flex-1 font-mono text-[10px] text-amber-300 select-all truncate">
                          {currentAppUrl}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyCurrentUrl}
                          className="px-2.5 py-1 bg-[#252b38] hover:bg-[#343d4f] text-neutral-200 hover:text-white rounded text-[10px] font-medium border border-[#3b4557] cursor-pointer shrink-0 transition-all"
                        >
                          {pkceCopied ? '已复制' : '复制'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#252b38] text-neutral-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</span>
                    <div>复制生成的 <code className="text-amber-200">Client ID</code> 粘贴在下方并授权。</div>
                  </div>
                </div>
              </div>

              {/* Single Input: Client ID */}
              <form onSubmit={handlePkceSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-300">
                    您的 Spotify Client ID
                  </label>
                  <input
                    type="text"
                    value={pkceClientId}
                    onChange={(e) => setPkceClientId(e.target.value)}
                    placeholder="粘贴您自己的 Client ID（此处不会提供默认 ID）"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full px-3.5 py-2.5 bg-[#0f1116] border border-[#2e3748] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#fecc11] font-mono shadow-inner"
                  />
                  <p className="text-[10px] leading-relaxed text-[#717b88] px-0.5">
                    Client ID 由 Spotify 开发者中心生成，仅保存在您当前设备的浏览器中；VITROBOX 不内置或共享任何测试 ID。
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                    {errorMessage}
                  </div>
                )}

                {/* Big Action Button (WebLyricFlow Style) */}
                <button
                  type="submit"
                  disabled={isSubmitting || !pkceClientId.trim()}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#fecc11] to-[#eab308] hover:from-[#ffd633] hover:to-[#facc15] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#fecc11]/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>正在启动 Spotify 授权...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>授权并开始同步歌词</span>
                    </>
                  )}
                </button>

                {lastAuthUrl && (
                  <div className="pt-2 text-center space-y-1.5">
                    <a
                      href={lastAuthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-[#242b38] hover:bg-[#2d3747] text-amber-300 hover:text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 border border-[#394457] transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>若浏览器未自动弹出窗口，点此在新标签页打开授权</span>
                    </a>
                    <p className="text-[10px] text-neutral-400">
                      授权完成后窗口将自动关闭，无需手动复制代码
                    </p>
                  </div>
                )}
              </form>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
