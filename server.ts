import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use(cookieParser());

// Persistent token & session storage
interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  clientId: string;
  clientSecret: string;
  user?: {
    id: string;
    displayName: string;
    email?: string;
    avatar?: string;
    product?: string;
  };
}

const SESSIONS_FILE = path.join(process.cwd(), '.spotify-sessions.json');

function loadSessions(): Map<string, SpotifySession> {
  const map = new Map<string, SpotifySession>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      for (const [id, s] of Object.entries(data)) {
        map.set(id, s as SpotifySession);
      }
    }
  } catch (err) {
    console.warn('Could not load sessions file:', err);
  }
  return map;
}

function saveSessions(map: Map<string, SpotifySession>) {
  try {
    const obj: Record<string, SpotifySession> = {};
    for (const [id, s] of map.entries()) {
      obj[id] = s;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save sessions file:', err);
  }
}

const sessions = loadSessions();

// Pending OAuth states store { clientId, clientSecret, expiresAt }
interface PendingState {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  expiresAt: number;
}
const pendingStates = new Map<string, PendingState>();

// Clean up stale pending states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingStates.entries()) {
    if (now > data.expiresAt) pendingStates.delete(state);
  }
}, 10 * 60 * 1000);

// Helper: Determine canonical callback redirect URI
function getRedirectUri(req: Request): string {
  const envUrl = process.env.APP_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return `${envUrl.replace(/\/$/, '')}/auth/callback`;
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  return `${proto}://${host}/auth/callback`;
}

// Helper: Extract session ID from Authorization header, cookie, or most recent active session fallback
function getSessionId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && sessions.has(token)) return token;
    if (token) return token;
  }
  if (req.cookies && req.cookies.spotify_session) {
    const cookieToken = req.cookies.spotify_session;
    if (sessions.has(cookieToken)) return cookieToken;
  }
  // Fallback to most recent active session (prevents logout on cross-origin header/cookie loss)
  if (sessions.size > 0) {
    const sorted = Array.from(sessions.entries()).sort(
      (a, b) => (b[1].expiresAt || 0) - (a[1].expiresAt || 0)
    );
    return sorted[0][0];
  }
  return null;
}

// Helper: Force-refresh an expired Spotify access token using refresh_token
async function forceRefreshToken(sessionId: string): Promise<string | null> {
  const session = sessions.get(sessionId);
  if (!session || !session.refreshToken) return null;

  try {
    const basicAuth = Buffer.from(`${session.clientId}:${session.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('Failed to refresh Spotify token:', await response.text());
      return null;
    }

    const data = await response.json();
    session.accessToken = data.access_token;
    session.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    if (data.refresh_token) {
      session.refreshToken = data.refresh_token;
    }
    sessions.set(sessionId, session);
    saveSessions(sessions);
    return session.accessToken;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

// Helper: Get valid access token (auto-refresh if expired)
async function getValidToken(sessionId: string): Promise<string | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Refresh if token expires in less than 90 seconds
  if (Date.now() > session.expiresAt - 90000) {
    return forceRefreshToken(sessionId);
  }

  return session.accessToken;
}

// ==========================================
// 1. Spotify OAuth Configuration & URL Endpoint
// ==========================================
app.get('/api/spotify/config', (req: Request, res: Response) => {
  const envClientId = process.env.SPOTIFY_CLIENT_ID || '';
  const envClientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  const redirectUri = getRedirectUri(req);

  res.json({
    configured: !!(envClientId && envClientSecret),
    redirectUri,
  });
});

app.post('/api/auth/spotify/url', (req: Request, res: Response) => {
  const clientId = req.body.clientId || process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = req.body.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(400).json({
      error: 'Missing Spotify Client ID or Client Secret. Please configure in .env or provide in dialog.',
    });
    return;
  }

  const redirectUri = getRedirectUri(req);
  const state = crypto.randomBytes(16).toString('hex');

  // Save pending credentials for code exchange
  pendingStates.set(state, {
    clientId,
    clientSecret,
    redirectUri,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-email',
    'user-read-private',
    'streaming',
  ].join(' ');

  const authUrl =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
      show_dialog: 'true',
    }).toString();

  res.json({ url: authUrl, state, redirectUri });
});

// ==========================================
// 1b. Spotify PKCE Token Exchange (No Client Secret Required)
// ==========================================
app.post('/api/auth/spotify/pkce-token', async (req: Request, res: Response) => {
  const { clientId, code, codeVerifier, redirectUri } = req.body;
  if (!clientId || !code || !codeVerifier) {
    res.status(400).json({ error: 'Missing clientId, code, or codeVerifier' });
    return;
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: String(clientId),
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: String(redirectUri || getRedirectUri(req)),
      code_verifier: String(codeVerifier),
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('PKCE Token exchange failed:', errBody);
      res.status(tokenRes.status).json({ error: errBody });
      return;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    let userData: any = { id: 'unknown', displayName: 'Spotify User' };
    try {
      const meRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        userData = {
          id: me.id,
          displayName: me.display_name || me.id,
          email: me.email,
          avatar: me.images?.[0]?.url,
          product: me.product,
        };
      }
    } catch {}

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      accessToken,
      refreshToken: refreshToken || '',
      expiresAt: Date.now() + expiresIn * 1000,
      clientId: String(clientId),
      clientSecret: '',
      user: userData,
    });
    saveSessions(sessions);

    res.cookie('spotify_session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      sessionId,
      accessToken,
      refreshToken,
      expiresIn,
      user: userData,
    });
  } catch (err: any) {
    console.error('PKCE exchange error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/spotify/pkce-refresh', async (req: Request, res: Response) => {
  const { clientId, refreshToken } = req.body;
  if (!clientId || !refreshToken) {
    res.status(400).json({ error: 'Missing clientId or refreshToken' });
    return;
  }

  try {
    const params = new URLSearchParams({
      client_id: String(clientId),
      grant_type: 'refresh_token',
      refresh_token: String(refreshToken),
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      res.status(tokenRes.status).json({ error: errBody });
      return;
    }

    const tokenData = await tokenRes.json();
    res.json(tokenData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. OAuth Callback Endpoint (Popup Handler)
// ==========================================
const handleAuthCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    const errorMsg = (error as string) || 'Spotify authorization was cancelled or failed';
    res.send(`<!DOCTYPE html>
<html>
  <head><title>Authorization Failed</title></head>
  <body style="background:#121212;color:#ff5555;font-family:sans-serif;padding:30px;text-align:center;">
    <h3>Spotify 登录失败</h3>
    <p>${errorMsg}</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
        setTimeout(() => window.close(), 1500);
      }
    </script>
  </body>
</html>`);
    return;
  }

  const stateStr = typeof state === 'string' ? state : '';
  const pending = stateStr ? pendingStates.get(stateStr) : undefined;

  if (pending) {
    pendingStates.delete(stateStr);
  }

  if (!pending) {
    // PKCE requests are initiated entirely in the browser and intentionally
    // have no server-side pending state. Never fall back to an app owner's
    // environment credentials for these user-owned Client IDs.
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Spotify Connected</title>
  </head>
  <body style="background:#121418;color:#1DB954;font-family:sans-serif;padding:40px;text-align:center;">
    <h2 style="font-size:20px;margin-bottom:8px;">✓ Spotify 授权已完成</h2>
    <p style="color:#8e98a5;font-size:13px;">正在同步曲库与动态歌词，窗口即将关闭...</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'SPOTIFY_PKCE_CODE', code: ${JSON.stringify(code)} }, '*');
        setTimeout(() => window.close(), 600);
      } else {
        window.location.href = '/?code=' + encodeURIComponent(${JSON.stringify(code)});
      }
    </script>
  </body>
</html>`);
    return;
  }

  const { clientId, clientSecret, redirectUri } = pending;

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Spotify token exchange failed:', errBody);
      res.status(500).send(`Failed to exchange token: ${errBody}`);
      return;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Fetch user profile
    let userData: any = { id: 'unknown', displayName: 'Spotify User' };
    try {
      const meRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        userData = {
          id: me.id,
          displayName: me.display_name || me.id,
          email: me.email,
          avatar: me.images?.[0]?.url,
          product: me.product,
        };
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      clientId,
      clientSecret,
      user: userData,
    });
    saveSessions(sessions);

    // Set cookie for browser sessions (SameSite=None for iframe compatibility)
    res.cookie('spotify_session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Spotify Connected</title>
    <style>
      body {
        background: #0f1115;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
      }
      .card {
        text-align: center;
        background: #181b22;
        padding: 32px 40px;
        border-radius: 16px;
        border: 1px solid #2d3340;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      }
      .spotify-logo {
        width: 48px;
        height: 48px;
        fill: #1DB954;
        margin-bottom: 16px;
      }
      h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1DB954; }
      p { margin: 0; font-size: 13px; color: #8e98a5; }
    </style>
  </head>
  <body>
    <div class="card">
      <svg class="spotify-logo" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      <h2>Spotify 授权已完成</h2>
      <p>正在同步音乐曲库与动态歌词，窗口即将自动关闭...</p>
    </div>
    <script>
      const sessionToken = ${JSON.stringify(sessionId)};
      const userData = ${JSON.stringify(userData)};
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          token: sessionToken,
          user: userData
        }, '*');
        setTimeout(() => window.close(), 600);
      } else {
        window.location.href = '/';
      }
    </script>
  </body>
</html>`);
  } catch (err: any) {
    console.error('Error handling callback:', err);
    res.status(500).send(`Server error: ${err.message}`);
  }
};

app.get('/auth/callback', handleAuthCallback);
app.get('/auth/callback/', handleAuthCallback);

// ==========================================
// 3. Spotify Authentication Status & Logout
// ==========================================
app.get('/api/spotify/status', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.json({ authenticated: false });
    return;
  }

  const token = await getValidToken(sessionId);
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  const session = sessions.get(sessionId);
  if (session && (!session.user || session.user.id === 'unknown')) {
    try {
      const meRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        session.user = {
          id: me.id,
          displayName: me.display_name || me.id,
          email: me.email,
          avatar: me.images?.[0]?.url,
          product: me.product,
        };
        saveSessions(sessions);
      }
    } catch {}
  }

  res.json({
    authenticated: true,
    user: session?.user || null,
  });
});

app.post('/api/spotify/logout', (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  if (sessionId) {
    sessions.delete(sessionId);
    saveSessions(sessions);
  }
  res.clearCookie('spotify_session', { path: '/' });
  res.json({ success: true });
});

// ==========================================
// 4. Live Playback Sync Endpoint
// ==========================================
app.get('/api/spotify/playback', async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated with Spotify' });
    return;
  }

  let token = await getValidToken(sessionId);
  if (!token) {
    res.status(401).json({ error: 'Token expired or invalid' });
    return;
  }

  try {
    // Helper: Spotify fetch with auto-refresh on 401
    const fetchWithRetry = async (url: string) => {
      let r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) {
        const refreshedToken = await forceRefreshToken(sessionId);
        if (refreshedToken) {
          token = refreshedToken;
          r = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
      return r;
    };

    // 1. Try full player endpoint
    let spotifyRes = await fetchWithRetry('https://api.spotify.com/v1/me/player');

    let isPlaying = false;
    let progressMs = 0;
    let durationMs = 0;
    let device: any = null;
    let item: any = null;

    let isPremiumRestricted = false;
    let isUserNotRegistered = false;
    let apiErrorMessage = '';

    const check403Error = async (response: any) => {
      try {
        const errText = await response.text();
        if (errText.includes('Active premium subscription required')) {
          isPremiumRestricted = true;
          apiErrorMessage = 'Spotify 开发者应用所有者需开通 Spotify Premium。';
        } else if (
          errText.includes('user may not be registered') ||
          errText.includes('developer.spotify.com/dashboard')
        ) {
          isUserNotRegistered = true;
          apiErrorMessage =
            'Spotify 开发者后台未登记该账号白名单 (User Management)。请前往 developer.spotify.com 在 App Settings -> User Management 添加当前 Spotify 账号邮箱。';
        } else {
          apiErrorMessage = `Spotify 访问受限 (403): ${errText.slice(0, 100)}`;
        }
      } catch {}
    };

    if (spotifyRes.status === 403) {
      await check403Error(spotifyRes);
    } else if (spotifyRes.ok && spotifyRes.status !== 204 && spotifyRes.status !== 202) {
      try {
        const data = await spotifyRes.json();
        isPlaying = Boolean(data.is_playing);
        progressMs = data.progress_ms || 0;
        device = data.device
          ? {
              name: data.device.name,
              type: data.device.type,
              volumePercent: data.device.volume_percent,
            }
          : null;
        item = data.item;
      } catch (e) {
        console.warn('Could not parse /v1/me/player json:', e);
      }
    }

    // 2. Fallback to /player/currently-playing
    if (!item && !isPremiumRestricted && !isUserNotRegistered) {
      const currentRes = await fetchWithRetry('https://api.spotify.com/v1/me/player/currently-playing');
      if (currentRes.status === 403) {
        await check403Error(currentRes);
      } else if (currentRes.ok && currentRes.status !== 204 && currentRes.status !== 202) {
        try {
          const currentData = await currentRes.json();
          isPlaying = Boolean(currentData.is_playing);
          progressMs = currentData.progress_ms || 0;
          item = currentData.item;
          if (!device) {
            device = {
              name: 'Spotify Web Player',
              type: 'Computer',
              volumePercent: 100,
            };
          }
        } catch (e) {
          console.warn('Could not parse /v1/me/player/currently-playing json:', e);
        }
      }
    }

    // 3. Fallback to /v1/me/player/recently-played if paused or no active stream
    if (!item && !isPremiumRestricted && !isUserNotRegistered) {
      try {
        const recentRes = await fetchWithRetry('https://api.spotify.com/v1/me/player/recently-played?limit=1');
        if (recentRes.ok && recentRes.status !== 204) {
          const recentData = await recentRes.json();
          if (recentData.items && recentData.items.length > 0) {
            item = recentData.items[0].track;
            isPlaying = false;
            progressMs = 0;
            if (!device) {
              device = {
                name: 'Spotify 最近播放',
                type: 'Computer',
                volumePercent: 100,
              };
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch recently-played:', e);
      }
    }

    if (item) {
      durationMs = item.duration_ms || 0;
    }

    res.json({
      isPlaying,
      progressMs,
      durationMs,
      device,
      isPremiumRestricted,
      isUserNotRegistered,
      apiErrorMessage: apiErrorMessage || undefined,
      suggestedTrack: {
        title: 'Candy Says',
        artist: 'The Velvet Underground',
        album: 'The Velvet Underground',
        duration: 243.6,
        albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/33/98/39/3398391b-3586-0903-a094-423c93d8fe53/00602547075031.rgb.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7f/a9/6f/7fa96fe6-861c-9d4a-731f-494eb5fe9b12/mzaf_15072715139268820405.plus.aac.p.m4a',
      },
      track: item
        ? {
            id: item.id || `custom-${item.name}`,
            title: item.name,
            artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
            album: item.album?.name,
            albumArt: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url,
            durationMs: item.duration_ms,
            uri: item.uri,
          }
        : null,
    });
  } catch (err: any) {
    console.error('Error fetching playback:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4a. Spotify Diagnostic Endpoint (Dev/Debug)
// ==========================================
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/spotify/diagnose', async (req: Request, res: Response) => {
    try {
      const sessionId = getSessionId(req);
      if (!sessionId) {
        return res.status(401).json({
          error: 'No active Spotify session found. Please connect to Spotify first.',
        });
      }
      const token = await getValidToken(sessionId);

      if (!token) {
        return res.status(401).json({
          error: 'No valid Spotify token',
        });
      }

      const paths = ['/me', '/me/player/devices', '/me/player'];

      const result: Record<string, unknown> = {};

      for (const path of paths) {
        const response = await fetch(`https://api.spotify.com/v1${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await response.text();
        let data: any = null;

        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text.slice(0, 500) };
          }
        }

        result[path] = {
          status: response.status,
          error: response.ok ? null : (data?.error || data?.message || text),
          ...(path === '/me' && response.ok
            ? {
                user: {
                  id: data?.id,
                  product: data?.product,
                },
              }
            : {}),
          ...(path === '/me/player/devices' && response.ok
            ? { devices: data?.devices }
            : {}),
          ...(path === '/me/player' && response.ok
            ? {
                isPlaying: data?.is_playing ?? false,
                deviceId: data?.device?.id ?? null,
                trackId: data?.item?.id ?? null,
              }
            : {}),
        };
      }

      return res.json(result);
    } catch (error) {
      console.error('[Spotify Diagnose]', error);
      return res.status(500).json({
        error: 'Spotify diagnostic request failed',
      });
    }
  });
}


// ==========================================
// 4b. Music Search & Fast Track Sync Endpoint
// ==========================================
app.get('/api/spotify/search', async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    res.json({ results: [] });
    return;
  }

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8`;
    const searchRes = await fetch(itunesUrl);
    if (!searchRes.ok) {
      res.json({ results: [] });
      return;
    }
    const data = await searchRes.json();
    const results = (data.results || []).map((r: any) => ({
      id: String(r.trackId),
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      albumArt: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      duration: Math.round((r.trackTimeMillis || 180000) / 1000),
      audioUrl: r.previewUrl,
    }));
    res.json({ results });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

app.post('/api/spotify/resolve-track', async (req: Request, res: Response) => {
  const { title, artist, album, albumArt, duration, audioUrl } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'Track title is required' });
    return;
  }

  const trackTitle = String(title).trim();
  const artistName = String(artist || 'Unknown Artist').trim();
  const durationSec = duration ? Number(duration) : 210;

  try {
    // 1. Fetch lyrics from LRCLIB
    const cleanedTrack = cleanTrackTitle(trackTitle);
    const headers = {
      'User-Agent': 'VITROBOX-Lyric-Speaker/2.0 (aquarium speaker; https://github.com/morror-art)',
    };

    let syncedLyrics: string | null = null;
    let plainLyrics: string | null = null;

    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTrack)}&artist_name=${encodeURIComponent(artistName)}`;
    let lrcRes = await fetch(getUrl, { headers });

    if (lrcRes.ok) {
      const data = await lrcRes.json();
      syncedLyrics = data.syncedLyrics || null;
      plainLyrics = data.plainLyrics || null;
    }

    if (!syncedLyrics && cleanedTrack !== trackTitle) {
      getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackTitle)}&artist_name=${encodeURIComponent(artistName)}`;
      lrcRes = await fetch(getUrl, { headers });
      if (lrcRes.ok) {
        const data = await lrcRes.json();
        syncedLyrics = data.syncedLyrics || null;
        plainLyrics = data.plainLyrics || null;
      }
    }

    if (!syncedLyrics) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTrack} ${artistName}`)}`;
      const searchRes = await fetch(searchUrl, { headers });
      if (searchRes.ok) {
        const items = await searchRes.json();
        if (Array.isArray(items) && items.length > 0) {
          const best = items.find((item: any) => item.syncedLyrics) || items[0];
          syncedLyrics = best?.syncedLyrics || null;
          plainLyrics = best?.plainLyrics || null;
        }
      }
    }

    res.json({
      success: true,
      track: {
        id: `synced-${Date.now()}`,
        title: trackTitle,
        artist: artistName,
        album: album || 'Spotify Direct Sync',
        duration: durationSec,
        coverArt: albumArt || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
        audioUrl: audioUrl || null,
        syncedLyrics,
        plainLyrics,
      },
    });
  } catch (err: any) {
    console.error('Resolve track error:', err);
    res.status(500).json({ error: 'Failed to resolve track', details: err.message });
  }
});

// ==========================================
// 5. Remote Playback Controls
// ==========================================
app.post('/api/spotify/control/:action', async (req: Request, res: Response) => {
  const { action } = req.params;
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const token = await getValidToken(sessionId);
  if (!token) {
    res.status(401).json({ error: 'Token invalid' });
    return;
  }

  try {
    let spotifyUrl = 'https://api.spotify.com/v1/me/player';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'play':
        spotifyUrl += '/play';
        method = 'PUT';
        break;
      case 'pause':
        spotifyUrl += '/pause';
        method = 'PUT';
        break;
      case 'next':
        spotifyUrl += '/next';
        method = 'POST';
        break;
      case 'prev':
        spotifyUrl += '/previous';
        method = 'POST';
        break;
      case 'seek': {
        const pos = req.body.positionMs || 0;
        spotifyUrl += `/seek?position_ms=${encodeURIComponent(pos)}`;
        method = 'PUT';
        break;
      }
      case 'volume': {
        const vol = req.body.volumePercent || 70;
        spotifyUrl += `/volume?volume_percent=${encodeURIComponent(vol)}`;
        method = 'PUT';
        break;
      }
      default:
        res.status(400).json({ error: 'Unknown action' });
        return;
    }

    const controlRes = await fetch(spotifyUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (controlRes.status === 204 || controlRes.ok) {
      res.json({ success: true });
    } else {
      const errText = await controlRes.text();
      res.status(controlRes.status).json({ error: errText || 'Spotify action failed' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. Real-Time Lyrics Retrieval (LRCLIB Integration)
// ==========================================
app.get('/api/lyrics/lrclib/search', async (req: Request, res: Response) => {
  const trackName = String(req.query.track || '').trim();
  const artistName = String(req.query.artist || '').trim();
  if (!trackName) {
    res.status(400).json({ error: 'Track name is required' });
    return;
  }

  try {
    const params = new URLSearchParams({ track_name: trackName });
    if (artistName) params.set('artist_name', artistName);
    const response = await fetch(`https://lrclib.net/api/search?${params}`, {
      headers: { 'User-Agent': 'VITROBOX/1.0 (lyrics correction tool)' },
    });
    if (!response.ok) {
      res.status(response.status).json({ error: 'LRCLIB search failed' });
      return;
    }
    const results = await response.json();
    res.json(Array.isArray(results) ? results.slice(0, 12).map((item: any) => ({
      id: item.id,
      trackName: item.trackName,
      artistName: item.artistName,
      albumName: item.albumName,
      duration: item.duration,
      syncedLyrics: item.syncedLyrics || null,
      plainLyrics: item.plainLyrics || null,
    })) : []);
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'LRCLIB is unavailable' });
  }
});

function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*-\s*(Remastered|Deluxe|Live|Radio Edit|Bonus Track|Mono|Stereo).*/i, '')
    .replace(/\s*\((Remastered|Deluxe|Live|feat\..*|ft\..*|Official.*)\)/i, '')
    .replace(/\s*\[.*\]/i, '')
    .trim();
}

app.get('/api/spotify/lyrics', async (req: Request, res: Response) => {
  const { track, artist, duration } = req.query;

  if (!track || !artist) {
    res.status(400).json({ error: 'Track title and artist are required' });
    return;
  }

  const rawTrack = String(track).trim();
  const cleanedTrack = cleanTrackTitle(rawTrack);
  const artistStr = String(artist).trim();
  const durationNum = duration ? Math.round(Number(duration)) : 0;

  // 1. Try NetEase Music API for high-precision timestamped lyrics & Chinese translations
  try {
    const neteaseSearchUrl = `https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(`${cleanedTrack} ${artistStr}`)}`;
    const neRes = await fetch(neteaseSearchUrl);
    if (neRes.ok) {
      const neData = await neRes.json();
      const first = neData.data?.[0];
      if (first && first.id) {
        const lyricRes = await fetch(`https://api.vkeys.cn/v2/music/netease/lyric?id=${first.id}`);
        if (lyricRes.ok) {
          const lrcData = await lyricRes.json();
          if (lrcData.data?.lrc) {
            res.json({
              syncedLyrics: lrcData.data.lrc,
              transLyrics: lrcData.data.trans || null,
              plainLyrics: null,
              source: 'netease',
              songName: first.song,
              singer: first.singer,
              cover: first.cover,
            });
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn('NetEase lyric search fallback:', err);
  }

  // 2. Try QQ Music (Tencent) API
  try {
    const tencentSearchUrl = `https://api.vkeys.cn/v2/music/tencent/search/song?word=${encodeURIComponent(`${cleanedTrack} ${artistStr}`)}`;
    const qqRes = await fetch(tencentSearchUrl);
    if (qqRes.ok) {
      const qqData = await qqRes.json();
      const list = qqData.data?.list || qqData.data || [];
      const first = Array.isArray(list) ? list[0] : list;
      if (first && first.mid) {
        const lyricRes = await fetch(`https://api.vkeys.cn/v2/music/tencent/lyric?mid=${first.mid}`);
        if (lyricRes.ok) {
          const lrcData = await lyricRes.json();
          if (lrcData.data?.lrc) {
            res.json({
              syncedLyrics: lrcData.data.lrc,
              transLyrics: lrcData.data.trans || null,
              plainLyrics: null,
              source: 'tencent',
              songName: first.song,
              singer: first.singer,
              cover: first.cover,
            });
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Tencent lyric search fallback:', err);
  }

  // 3. Fallback to LRCLIB
  const headers = {
    'User-Agent': 'VITROBOX-Lyric-Speaker/2.0 (aquarium speaker; https://github.com/morror-art)',
  };

  try {
    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTrack)}&artist_name=${encodeURIComponent(artistStr)}`;
    let lrcRes = await fetch(getUrl, { headers });

    if (lrcRes.ok) {
      const data = await lrcRes.json();
      if (data.syncedLyrics || data.plainLyrics) {
        res.json({
          syncedLyrics: data.syncedLyrics,
          transLyrics: null,
          plainLyrics: data.plainLyrics,
          source: 'lrclib_exact_clean',
        });
        return;
      }
    }

    if (cleanedTrack !== rawTrack) {
      getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(rawTrack)}&artist_name=${encodeURIComponent(artistStr)}`;
      lrcRes = await fetch(getUrl, { headers });
      if (lrcRes.ok) {
        const data = await lrcRes.json();
        if (data.syncedLyrics || data.plainLyrics) {
          res.json({
            syncedLyrics: data.syncedLyrics,
            transLyrics: null,
            plainLyrics: data.plainLyrics,
            source: 'lrclib_exact_raw',
          });
          return;
        }
      }
    }

    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTrack} ${artistStr}`)}`;
    const searchRes = await fetch(searchUrl, { headers });

    if (searchRes.ok) {
      const items = await searchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const best = items.find((item: any) => item.syncedLyrics) || items[0];
        if (best && (best.syncedLyrics || best.plainLyrics)) {
          res.json({
            syncedLyrics: best.syncedLyrics,
            transLyrics: null,
            plainLyrics: best.plainLyrics,
            source: 'lrclib_search',
          });
          return;
        }
      }
    }

    res.json({
      syncedLyrics: null,
      transLyrics: null,
      plainLyrics: null,
      source: 'none',
    });
  } catch (err: any) {
    console.error('Error fetching lyrics:', err);
    res.status(500).json({ error: 'Lyrics fetch failed', details: err.message });
  }
});

// ==========================================
// 7. Vite Integration (Dev Middleware & Static Dist)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MORROR ART Server running on port ${PORT}`);
  });
}

// Vercel imports this Express instance as a serverless function. Local
// development still starts the combined Vite + Express server as before.
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
