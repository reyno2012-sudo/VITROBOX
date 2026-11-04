export interface SpotifyUser {
  id: string;
  displayName: string;
  email?: string;
  avatar?: string;
  product?: string;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  device?: {
    name: string;
    type: string;
    volumePercent: number;
  } | null;
  isPremiumRestricted?: boolean;
  isUserNotRegistered?: boolean;
  apiErrorMessage?: string;
  suggestedTrack?: {
    title: string;
    artist: string;
    album: string;
    duration: number;
    albumArt: string;
    audioUrl?: string;
  };
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    durationMs: number;
    uri?: string;
  } | null;
}

export interface TrackSearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration: number;
  audioUrl?: string;
}

const STORAGE_KEY = 'spotify_auth_token';

export const spotifyStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {}
  },
  clearToken() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
};

function getHeaders(token?: string | null): HeadersInit {
  const t = token || spotifyStorage.getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (t) {
    headers['Authorization'] = `Bearer ${t}`;
  }
  return headers;
}

export async function getSpotifyConfig(): Promise<{
  configured: boolean;
  redirectUri: string;
}> {
  const res = await fetch('/api/spotify/config');
  if (!res.ok) throw new Error('Failed to load Spotify configuration');
  return res.json();
}

export async function getSpotifyAuthUrl(credentials?: {
  clientId?: string;
  clientSecret?: string;
}): Promise<{ url: string; state: string; redirectUri: string }> {
  const res = await fetch('/api/auth/spotify/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials || {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate Spotify authorization URL');
  }
  return res.json();
}

export async function getSpotifyStatus(): Promise<{ authenticated: boolean; user?: SpotifyUser }> {
  const token = spotifyStorage.getToken();
  const res = await fetch('/api/spotify/status', {
    headers: getHeaders(token),
    credentials: 'include',
  });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

export async function logoutSpotify(): Promise<void> {
  const token = spotifyStorage.getToken();
  try {
    await fetch('/api/spotify/logout', {
      method: 'POST',
      headers: getHeaders(token),
      credentials: 'include',
    });
  } finally {
    spotifyStorage.clearToken();
  }
}

export async function getSpotifyPlayback(): Promise<SpotifyPlaybackState> {
  const token = spotifyStorage.getToken();
  const res = await fetch('/api/spotify/playback', {
    headers: getHeaders(token),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Playback fetch error (${res.status})`);
  }
  return res.json();
}

export async function spotifyControl(
  action: 'play' | 'pause' | 'next' | 'prev' | 'seek' | 'volume',
  payload?: { positionMs?: number; volumePercent?: number }
): Promise<boolean> {
  const token = spotifyStorage.getToken();
  const res = await fetch(`/api/spotify/control/${action}`, {
    method: 'POST',
    headers: getHeaders(token),
    credentials: 'include',
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return res.ok;
}

export async function getSpotifyLyrics(
  track: string,
  artist: string,
  durationSec?: number
): Promise<{
  syncedLyrics?: string;
  transLyrics?: string | null;
  plainLyrics?: string;
  source?: string;
  songName?: string;
  singer?: string;
}> {
  const params = new URLSearchParams({
    track,
    artist,
    ...(durationSec ? { duration: String(Math.round(durationSec)) } : {}),
  });
  const res = await fetch(`/api/spotify/lyrics?${params.toString()}`);
  if (!res.ok) return {};
  return res.json();
}

export interface LrcLibSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

export async function searchLrcLibLyrics(track: string, artist: string): Promise<LrcLibSearchResult[]> {
  const params = new URLSearchParams({ track, artist });
  const response = await fetch(`/api/lyrics/lrclib/search?${params}`);
  if (!response.ok) throw new Error('未能从 LRCLIB 搜索歌词');
  return response.json();
}

// -----------------------------------------------------------
// PKCE (Proof Key for Code Exchange) Helpers (No Client Secret)
// -----------------------------------------------------------
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const hashed = await sha256(verifier);
  const challenge = base64urlEncode(hashed);
  return { verifier, challenge };
}

export async function exchangePkceToken(
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri?: string
): Promise<{
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  user?: SpotifyUser;
}> {
  const res = await fetch('/api/auth/spotify/pkce-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      code,
      codeVerifier,
      redirectUri,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `PKCE Token exchange error (${res.status})`);
  }

  const data = await res.json();
  if (data.accessToken) {
    spotifyStorage.setToken(data.sessionId || data.accessToken);
    localStorage.setItem('sp_access_token', data.accessToken);
    if (data.refreshToken) localStorage.setItem('sp_refresh_token', data.refreshToken);
  }
  return data;
}


export async function searchMusicTracks(query: string): Promise<TrackSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ results: [] }));
  return data.results || [];
}

export async function resolveTrackAndLyrics(trackData: {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration?: number;
  audioUrl?: string;
}): Promise<{
  success: boolean;
  track?: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    coverArt: string;
    audioUrl?: string;
    syncedLyrics?: string | null;
    plainLyrics?: string | null;
  };
}> {
  const res = await fetch('/api/spotify/resolve-track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackData),
  });
  if (!res.ok) return { success: false };
  return res.json();
}

export async function getSpotifyDiagnose(): Promise<Record<string, any>> {
  const token = spotifyStorage.getToken();
  const res = await fetch('/api/spotify/diagnose', {
    headers: getHeaders(token),
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Diagnose failed with status ${res.status}`);
  }
  return res.json();
}

