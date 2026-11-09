// Development-only credential entry. Never imported by a Vercel function or client.
import { readFile, writeFile } from 'node:fs/promises';
import { checkOrigin, readJson, json, HttpError } from '../server/http.mjs';
export async function localSetup(req, res, port) {
  try {
    if (process.env.VERCEL || ![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) throw new HttpError(403, 'Local access only.');
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Frame-Options', 'DENY');
    if (req.method === 'GET') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(await readFile(new URL('./setup.html', import.meta.url))); }
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    checkOrigin(req);
    const body = await readJson(req, 3000);
    if (typeof body.key !== 'string' || !/^gsk_[A-Za-z0-9]{30,150}$/.test(body.key)) throw new HttpError(400, 'Введите новый ключ Groq, начинающийся с gsk_.');
    await writeFile(new URL('../.env.local', import.meta.url), `GROQ_API_KEY=${body.key}\n`, { mode: 0o600 });
    process.env.GROQ_API_KEY = body.key;
    json(res, 200, { message: 'Сохранено. AI подключён к локальному серверу. Сообщите в чат только «готово», без ключа.' });
  } catch (error) { json(res, error.status || 500, { error: error.status ? error.message : 'Не удалось сохранить настройки.' }); }
}
