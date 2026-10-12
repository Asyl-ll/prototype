import { endpoint, ready, json, HttpError } from '../server/http.mjs';
export default endpoint(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  json(res, 200, { configured: ready() });
}, { publicRead: true });
