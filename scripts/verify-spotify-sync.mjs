import assert from 'node:assert/strict';

process.env.VERCEL = '1';
const originalFetch = globalThis.fetch;
let playerResponse = { status: 200, body: {
  is_playing: true,
  progress_ms: 42000,
  device: { name: 'Desktop', type: 'Computer', volume_percent: 60 },
  item: { id: 'song-2', name: 'Current song', duration_ms: 180000,
    artists: [{ name: 'Singer' }], album: { name: 'Album', images: [] } },
} };
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).endsWith('/v1/me')) return Response.json({ id: 'listener', display_name: 'Listener' });
  if (String(url).endsWith('/v1/me/player')) {
    return playerResponse.status === 204
      ? new Response(null, { status: 204 })
      : playerResponse.status === 401
        ? Response.json({ error: 'expired' }, { status: 401 })
        : Response.json(playerResponse.body);
  }
  if (String(url).endsWith('/v1/me/player/currently-playing')) return new Response(null, { status: 204 });
  if (String(url).endsWith('/api/token')) return Response.json({ access_token: 'renewed', expires_in: 3600 });
  throw new Error(`Unexpected external request: ${url}`);
};

const { default: app } = await import('../server.ts');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const headers = { 'X-Spotify-Access-Token': 'browser-access-token' };
let testError;
try {
  const status = await (await originalFetch(`${base}/api/spotify/status`, { headers })).json();
  assert.equal(status.authenticated, true);
  assert.equal(status.user.displayName, 'Listener');

  const live = await (await originalFetch(`${base}/api/spotify/playback`, { headers })).json();
  assert.equal(live.isPlaying, true);
  assert.equal(live.progressMs, 42000);
  assert.equal(live.track.title, 'Current song');
  assert.ok(calls.some((call) => call.init.headers?.Authorization === 'Bearer browser-access-token'));

  playerResponse = { status: 204 };
  const idle = await (await originalFetch(`${base}/api/spotify/playback`, { headers })).json();
  assert.equal(idle.track, null, 'No active playback must not revive a recently played song');
  assert.equal(idle.isPlaying, false);

  playerResponse = { status: 401 };
  const expired = await originalFetch(`${base}/api/spotify/playback`, { headers });
  assert.equal(expired.status, 401, 'Expired access tokens must trigger client refresh');

  const refresh = await originalFetch(`${base}/api/auth/spotify/pkce-refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: 'client-id', refreshToken: 'refresh-token' }),
  });
  assert.equal(refresh.status, 200);
  const tokenCall = calls.find((call) => call.url.endsWith('/api/token'));
  assert.equal(new URLSearchParams(tokenCall.init.body).get('client_id'), 'client-id');
  assert.equal(tokenCall.init.headers.Authorization, undefined);
} catch (error) {
  testError = error;
} finally {
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = originalFetch;
}
if (testError) {
  console.error(testError);
  process.exit(1);
}
console.log('Spotify stateless playback, idle state, and PKCE refresh verified.');
process.exit(0);
