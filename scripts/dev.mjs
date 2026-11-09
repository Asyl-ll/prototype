import { createServer } from 'node:http';
import { createServer as viteServer, preview } from 'vite';
import session from '../api/session.js';
import analyze from '../api/analyze.js';
import transcribe from '../api/transcribe.js';
import { localSetup } from './local-setup.mjs';
const port = Number(process.env.PORT || 5173);
const prod = process.argv.includes('--production');
const vite = prod ? await preview({ preview: { port: port + 1, host: '127.0.0.1' } }) : await viteServer({ server: { middlewareMode: true, hmr: { port: port + 100 } }, appType: 'spa' });
const routes = { '/api/session': session, '/api/analyze': analyze, '/api/transcribe': transcribe };
const server = createServer(async (req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/__setup') return localSetup(req, res, port);
  const handler = routes[new URL(req.url, 'http://localhost').pathname];
  if (handler) return handler(req, res);
  if (req.url.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  if (!prod) return vite.middlewares(req, res);
  const upstream = await fetch(`http://127.0.0.1:${port + 1}${req.url}`);
  res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
  res.end(Buffer.from(await upstream.arrayBuffer()));
});
server.listen(port, '127.0.0.1', () => console.log(`Lecture+ web service: http://localhost:${port}`));
