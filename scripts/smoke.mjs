import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { source } from '../tests/fixture.mjs';
const base = process.argv[2] || 'http://localhost:5173';
if (!process.env.APP_ACCESS_CODE) throw new Error('Set APP_ACCESS_CODE first.');
const login = await fetch(base + '/api/session', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: process.env.APP_ACCESS_CODE }) });
if (!login.ok) throw new Error(`Login failed: ${login.status}`);
const cookie = login.headers.get('set-cookie').split(';')[0];
const headers = { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' };
const mode = process.argv[3] || 'text';
if (mode === 'audio') {
  const audio = await readFile('test-results/fixtures/spoken-lecture.wav');
  const response = await fetch(base + '/api/transcribe', { method: 'POST', headers, body: JSON.stringify({ audio: audio.toString('base64') }) });
  const data = await response.json();
  console.log(JSON.stringify({ test: 'real-audio', status: response.status, text: data.text, error: data.error }));
  if (!response.ok || !data.text?.toLowerCase().includes('operating system')) process.exitCode = 1;
} else {
  const response = await fetch(base + '/api/analyze', { method: 'POST', headers, body: JSON.stringify({ mode: 'final', text: source, date: '2026-10-05', language: 'English', syllabus: '' }) });
  const data = await response.json();
  console.log(JSON.stringify({ test: 'real-text', status: response.status, title: data.title, quizCount: data.quiz?.length, assignments: data.teacherAssignments?.map(({ title, date, time }) => ({ title, date, time })), futureTopics: data.futureTopics?.length, error: data.error }));
  if (!response.ok || !data.analysis?.overview || !data.quiz?.length || !data.teacherAssignments?.length || !data.futureTopics?.length) process.exitCode = 1;
  else { await mkdir('test-results', { recursive: true }); await writeFile('test-results/live-study-guide.json', JSON.stringify(data, null, 2)); }
}
