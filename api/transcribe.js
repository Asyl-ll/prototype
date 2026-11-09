import { endpoint, readJson, json, HttpError } from '../server/http.mjs';
import { groq } from '../server/groq.mjs';
export default endpoint(async (req, res) => {
  const body = await readJson(req, 2_900_000);
  if (typeof body.audio !== 'string' || body.audio.length > 2_700_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)) throw new HttpError(400, 'Invalid audio section.');
  const bytes = Buffer.from(body.audio, 'base64');
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE' || bytes.readUInt32LE(24) !== 16000 || bytes.readUInt16LE(22) !== 1 || bytes.readUInt16LE(34) !== 16) throw new HttpError(400, 'Audio must be mono 16 kHz PCM WAV.');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/wav' }), 'lecture-section.wav');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  const result = await groq('audio/transcriptions', form, true);
  const text = Array.isArray(result.segments)
    ? result.segments.filter(s => !(s.no_speech_prob > 0.65 && s.avg_logprob < -0.5)).map(s => s.text).join(' ').trim()
    : String(result.text || '').trim();
  json(res, 200, { text });
});
