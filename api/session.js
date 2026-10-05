import { endpoint, readJson, ready, authenticated, same, issueToken, json, HttpError } from '../server/http.mjs';
export default endpoint(async (req, res) => {
  if (req.method === 'GET') return json(res, 200, { configured: ready(), authenticated: authenticated(req) });
  const body = await readJson(req, 2000);
  if (body.logout) {
    res.setHeader('Set-Cookie', 'lecture_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    return json(res, 200, { authenticated: false });
  }
  if (typeof body.code !== 'string' || !same(body.code, process.env.APP_ACCESS_CODE)) throw new HttpError(401, 'That access code is not correct.');
  const secure = process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `lecture_session=${issueToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`);
  json(res, 200, { authenticated: true });
}, { publicRead: true });
