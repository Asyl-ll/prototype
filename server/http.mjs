export class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export function ready() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}
export function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new HttpError(403, 'A same-origin browser request is required.');
  let url;
  try { url = new URL(origin); } catch { throw new HttpError(403, 'Invalid request origin.'); }
  if (url.host !== req.headers.host || !['http:', 'https:'].includes(url.protocol)) throw new HttpError(403, 'Request origin is not allowed.');
}
const buckets = new Map();
export function throttle(req, kind, max = 45) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0];
  const key = `${kind}:${ip}`;
  const now = Date.now();
  for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
  const bucket = buckets.get(key) || { count: 0, until: now + 60_000 };
  if (++bucket.count > max) throw new HttpError(429, 'Too many requests. Please wait a minute.', Math.ceil((bucket.until - now) / 1000));
  buckets.set(key, bucket);
}
export async function readJson(req, limit = 400_000) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send JSON data.');
  if (Number(req.headers['content-length']) > limit) throw new HttpError(413, 'The request is too large.');
  if (req.body !== undefined) {
    const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(text) > limit) throw new HttpError(413, 'The request is too large.');
    try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'The request is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}
export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(data));
}
export function endpoint(work, { publicRead = false } = {}) {
  return async (req, res) => {
    try {
      if (publicRead && req.method === 'GET') return await work(req, res);
      if (req.method !== 'POST') { res.setHeader('Allow', publicRead ? 'GET, POST' : 'POST'); throw new HttpError(405, 'Method not allowed.'); }
      checkOrigin(req);
      throttle(req, publicRead ? 'login' : 'api', publicRead ? 8 : 45);
      if (!ready()) throw new HttpError(503, 'AI is not configured yet. The site owner must add the server secrets.');
      await work(req, res);
    } catch (error) {
      if (res.writableEnded) return;
      if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
      json(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong. Please try again.', ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) });
    }
  };
}
