import { HttpError } from './http.mjs';
export async function groq(path, body, multipart = false) {
  let response;
  try {
    response = await fetch(`https://api.groq.com/openai/v1/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}`, ...(multipart ? {} : { 'Content-Type': 'application/json' }) },
      body: multipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(95_000)
    });
  } catch { throw new HttpError(504, 'The AI service took too long to respond. Please try again.'); }
  if (!response.ok) {
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after')) || 60;
      throw new HttpError(429, 'The free AI quota is busy. Wait and try again; daily limits may take longer to reset.', Math.min(3600, Math.max(5, seconds)));
    }
    if ([401, 403].includes(response.status)) throw new HttpError(503, 'The AI key is not accepted. Ask the site owner to check the Groq key.');
    if (response.status === 413) throw new HttpError(413, 'This audio section is too large. Try a shorter recording.');
    throw new HttpError(502, 'The AI service could not process this request. Try a shorter file or try again later.');
  }
  try { return await response.json(); } catch { throw new HttpError(502, 'The AI service returned an unreadable response.'); }
}
