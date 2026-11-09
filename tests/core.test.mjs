import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { validDate, hasEvidence, groundedDeadlines, splitText } from '../shared/content.mjs';
import { buildIcs, reminderTime } from '../shared/calendar.mjs';
import { validateResult, resultSchema } from '../server/analysis.mjs';
import { checkOrigin } from '../server/http.mjs';
import session from '../api/session.js';
import analyze from '../api/analyze.js';
import transcribe from '../api/transcribe.js';
import { wav, validateFile } from '../src/extract.mjs';
import { normalizeResult } from '../shared/result.mjs';
import { source, studyGuide } from './fixture.mjs';

test('dates reject impossible days and tolerate leap years', () => {
  assert.equal(validDate('2026-02-30'), false); assert.equal(validDate('2024-02-29'), true); assert.equal(validDate('2026-02-29'), false); assert.equal(validDate('tomorrow'), false);
});
test('deadline evidence must be verbatim in lecture; fabricated dates are removed', () => {
  assert.ok(hasEvidence(source, 'Submit the OS worksheet by 2030-10-12 at 18:00.'));
  const data = groundedDeadlines([...studyGuide.teacherAssignments, { title: 'Imaginary exam', quote: 'An exam will happen next Monday.', date: '2030-01-01' }], source);
  assert.equal(data.length, 1);
  assert.equal(groundedDeadlines([{ ...studyGuide.teacherAssignments[0], date: '2030-02-30', time: '25:00' }], source)[0].date, '');
});
test('splitting preserves every character of a long lecture and respects size', () => {
  const text = source.repeat(400); const chunks = splitText(text);
  assert.equal(chunks.join(''), text); assert.ok(chunks.every(c => c.length <= 6000));
  const tinyTail = splitText('x'.repeat(4001));
  assert.ok(tinyTail.every(c => c.length >= 30 && c.length <= 4000));
  assert.equal(tinyTail.join('').length, 4001);
});
test('schema rejects incomplete guides and invalid correct answers', () => {
  assert.throws(() => validateResult({}, resultSchema, source));
  assert.throws(() => validateResult({ ...studyGuide, quiz: [{ ...studyGuide.quiz[0], answer: 9 }] }, resultSchema, source));
  assert.equal(validateResult(studyGuide, resultSchema, source).title, 'Operating systems');
});
test('old saved guides are normalized into the new learning flow', () => {
  const old = normalizeResult({ title: 'Legacy', summary: 'Old summary', topics: ['Memory'], tasks: ['Review'], deadlines: studyGuide.teacherAssignments, quiz: studyGuide.quiz, roadmap: { review: ['Basics'], next: ['Scheduling'], later: [] } });
  assert.equal(old.analysis.overview, 'Old summary');
  assert.equal(old.teacherAssignments[0].title, 'OS worksheet');
  assert.equal(old.practiceTasks[0].title, 'Review');
  assert.equal(old.futureTopics[0].title, 'Scheduling');
});
test('ICS escapes injection, folds Unicode by bytes and uses absolute UTC time', () => {
  const deadline = { ...studyGuide.teacherAssignments[0], title: 'Test, task; \nEND:VEVENT\n' + 'Привет'.repeat(30) };
  const text = buildIcs(deadline, '1 day before', 'test-id', new Date('2026-10-05T10:00:00Z'));
  assert.equal(text.split('\r\nEND:VEVENT').length, 2);
  assert.ok(text.includes('TRIGGER:-P1D'));
  assert.ok(text.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.match(text, /DTSTART:\d{8}T\d{6}Z/);
  assert.equal(reminderTime(studyGuide.teacherAssignments[0], '1 hour before'), new Date('2030-10-12T18:00:00').getTime() - 3600000);
  assert.throws(() => buildIcs({ ...deadline, time: '' }, '1 day before', 'id'));
});
test('file validation and audio encoding enforce actual supported limits', () => {
  assert.throws(() => validateFile({ name: 'bad.exe', size: 1 }));
  assert.throws(() => validateFile({ name: 'blank.txt', size: 0 }));
  assert.throws(() => validateFile({ name: 'large.pdf', size: 16 * 1024 * 1024 }));
  const bytes = wav(new Float32Array([0, 1, -1]));
  assert.equal(Buffer.from(bytes).toString('ascii', 0, 4), 'RIFF');
  assert.equal(new DataView(bytes.buffer).getUint32(24, true), 16000);
  assert.equal(bytes.length, 50);
});
test('API rejects missing setup, bad origins and invalid input without requiring a site code', async () => {
  const prior = process.env.GROQ_API_KEY;
  const server = createServer((req, res) => ({ '/api/session': session, '/api/analyze': analyze, '/api/transcribe': transcribe })[new URL(req.url, 'http://localhost').pathname](req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, data, extra = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...extra }, body: JSON.stringify(data) });
  try {
    delete process.env.GROQ_API_KEY;
    assert.equal((await (await fetch(base + '/api/session')).json()).configured, false);
    assert.equal((await post('/api/analyze', {})).status, 503);
    process.env.GROQ_API_KEY = 'test-only-not-a-real-key';
    assert.deepEqual(await (await fetch(base + '/api/session')).json(), { configured: true });
    assert.equal((await post('/api/analyze', {})).status, 400);
    assert.equal((await post('/api/analyze', {}, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post('/api/transcribe', { audio: 'not-wav' })).status, 400);
    assert.equal((await post('/api/analyze', { huge: 'a'.repeat(810000) })).status, 413);
    assert.throws(() => checkOrigin({ headers: { host: 'site.example' } }));
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (prior === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = prior;
  }
});
