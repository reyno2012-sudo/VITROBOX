import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const configPath = path.join(root, 'vercel.json');
const functionPath = path.join(root, 'api', 'index.ts');
const serverPath = path.join(root, 'server.ts');

assert.ok(fs.existsSync(configPath), 'vercel.json must exist so OAuth routes do not return 404');
assert.ok(fs.existsSync(functionPath), 'api/index.ts must expose the Express backend as a Vercel Function');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const rewrites = config.rewrites ?? [];

assert.ok(
  rewrites.some(
    (rule) => rule.source === '/auth/callback' && rule.destination.includes('/api/index')
  ),
  '/auth/callback must be routed to the backend function'
);
assert.ok(
  rewrites.some(
    (rule) => rule.source === '/api/:path*' && rule.destination.includes('/api/index')
  ),
  '/api/:path* must be routed to the backend function'
);

const serverSource = fs.readFileSync(serverPath, 'utf8');
assert.match(serverSource, /export default app;/, 'server.ts must export the Express app');
assert.match(
  serverSource,
  /if \(!process\.env\.VERCEL\)/,
  'server.ts must not open a listening port inside Vercel Functions'
);
assert.match(
  serverSource,
  /if \(!pending\) \{[\s\S]*SPOTIFY_PKCE_CODE/,
  'callbacks without a matching server-side state must be handled as PKCE callbacks'
);

console.log('Vercel OAuth routing contract is configured.');
