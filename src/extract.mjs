import { MAX_TEXT } from '../shared/content.mjs';
import { api, pause } from './api.mjs';

export const AUDIO = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'mp4'];
export function extension(name) { return name.split('.').pop().toLowerCase(); }
export function validateFile(file) {
  const ext = extension(file.name);
  if (![...AUDIO, 'pdf', 'pptx', 'docx', 'txt'].includes(ext)) throw new Error('Choose MP3, M4A, WAV, WEBM, OGG, MP4, PDF, PPTX, DOCX or TXT.');
  if (!file.size) throw new Error('This file is empty.');
  const limit = AUDIO.includes(ext) ? 50 : 15;
  if (file.size > limit * 1024 * 1024) throw new Error(`This file is too large. The limit is ${limit} MB.`);
}
export function validateText(text) {
  const value = text.replace(/\u0000/g, '').trim();
  if (value.length < 30) throw new Error('We found too little text. Add at least 30 characters. Scanned PDFs need OCR before upload.');
  if (value.length > MAX_TEXT) throw new Error('This lecture is too long. Split it into files of up to 100,000 text characters.');
  return value;
}
export async function extract(file, { signal, progress }) {
  validateFile(file);
  const ext = extension(file.name);
  if (AUDIO.includes(ext)) return transcribe(file, { signal, progress });
  progress(8, 'Reading your document on this device…');
  signal.throwIfAborted();
  let text = '';
  if (ext === 'txt') text = await file.text();
  if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
    const abort = () => { void task.destroy(); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 100) throw new Error('Upload a PDF with up to 100 pages.');
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        signal.throwIfAborted();
        const content = await (await pdf.getPage(i)).getTextContent();
        pages.push(`[Page ${i}]\n${content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('')}`);
        progress(8 + 30 * i / pdf.numPages, `Reading page ${i} of ${pdf.numPages}…`);
      }
      text = pages.join('\n\n');
    } finally { signal.removeEventListener('abort', abort); await task.destroy(); }
  }
  if (ext === 'docx' || ext === 'pptx') {
    const { unzipSync, strFromU8 } = await import('fflate');
    // Check declared inflated sizes before extraction to reject archive bombs.
    const selected = []; let total = 0;
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter(entry) {
      const take = ext === 'docx' ? entry.name === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(entry.name);
      if (take) { total += entry.originalSize; selected.push(entry.name); }
      if (total > 12_000_000 || selected.length > 100) throw new Error('The document contains too much expanded content.');
      return take;
    } });
    const names = Object.keys(entries).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!names.length) throw new Error('This document is damaged or has no readable text.');
    text = names.map((name, index) => {
      const doc = new DOMParser().parseFromString(strFromU8(entries[name]), 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('The document XML is damaged.');
      const paragraphs = [...doc.getElementsByTagNameNS('*', 'p')];
      const content = paragraphs.map(p => [...p.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join(' ')).join('\n');
      return ext === 'pptx' ? `[Slide ${index + 1}]\n${content}` : content;
    }).join('\n\n');
  }
  signal.throwIfAborted();
  // Page/slide markers alone must not make an image-only document look readable.
  validateText(text.replace(/\[(Page|Slide) \d+\]/g, ''));
  return validateText(text);
}
export function wav(samples) {
  const bytes = new ArrayBuffer(44 + samples.length * 2), view = new DataView(bytes);
  const put = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  put(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); put(8, 'WAVE'); put(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => { const s = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true); });
  return new Uint8Array(bytes);
}
function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
async function transcribe(file, { signal, progress }) {
  progress(4, 'Preparing audio on this device…');
  const context = new AudioContext({ sampleRate: 16000 });
  let buffer;
  try { buffer = await context.decodeAudioData(await file.arrayBuffer()); }
  catch { throw new Error('This browser cannot read the audio. Try an MP3 or WAV file.'); }
  finally { await context.close(); }
  signal.throwIfAborted();
  if (buffer.duration > 30 * 60) throw new Error('Use a recording up to 30 minutes. Split a longer lecture into parts.');
  const samples = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < samples.length; i++) samples[i] += channel[i] / buffer.numberOfChannels;
  }
  const chunkSize = 16000 * 55;
  const count = Math.ceil(samples.length / chunkSize), sections = [];
  for (let index = 0; index < count; index++) {
    signal.throwIfAborted();
    const started = Date.now();
    const part = samples.subarray(index * chunkSize, (index + 1) * chunkSize);
    let energy = 0; for (const sample of part) energy += sample * sample;
    if (Math.sqrt(energy / part.length) > 0.0001) {
      progress(8 + 40 * index / count, `Transcribing audio ${index + 1} of ${count}…`);
      const result = await api('transcribe', { audio: base64(wav(part)) }, { signal, onWait: message => progress(8 + 40 * index / count, message) });
      if (result.text.trim()) sections.push(`[${Math.floor(index * 55 / 60)}:${String(index * 55 % 60).padStart(2, '0')}] ${result.text.trim()}`);
    }
    if (index < count - 1) await pause(Math.max(0, 3400 - (Date.now() - started)), signal);
  }
  return validateText(sections.join('\n\n'));
}
