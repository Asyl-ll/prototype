import './style.css';
import { api } from './api.mjs';
import { extract, validateFile, validateText, extension } from './extract.mjs';
import { splitText, localDate, validDate, validTime } from '../shared/content.mjs';
import { buildIcs, googleUrl, reminderTime } from '../shared/calendar.mjs';
import * as storage from './storage.mjs';

const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
let file = null, lecture = null, controller = null, lastCalendar = null, toastTimer, recorder = null, recordingTimer, session = {};
const steps = { upload: 1, processing: 2, summary: 3, deadlines: 3, todo: 4, reminder: 4, success: 4, history: 0 };
const headings = { upload: 'h-upload', processing: 'h-proc', summary: 'h-sum', deadlines: 'h-dl', todo: 'h-todo', reminder: 'h-rem', success: 'h-ok', history: 'h-history' };
function show(name) {
  for (const screen of Object.keys(steps)) $('screen-' + screen).hidden = screen !== name;
  for (let n = 1; n <= 4; n++) {
    $('st' + n).classList.toggle('done', n < steps[name]);
    if (n === steps[name]) $('st' + n).setAttribute('aria-current', 'step'); else $('st' + n).removeAttribute('aria-current');
  }
  $(headings[name]).focus(); window.scrollTo(0, 0);
}
function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
function toast(text) { clearTimeout(toastTimer); message('toast', text); toastTimer = setTimeout(() => $('toast').hidden = true, 7000); }
function progress(percent, text) { $('bar-fill').style.width = `${percent}%`; $('bar').setAttribute('aria-valuenow', String(Math.round(percent))); $('proc-status').textContent = text; }
function save() {
  if (!lecture?.saveLocal) return;
  try { storage.saveLecture(lecture); $('saved-state').textContent = 'Saved on this device'; }
  catch { $('saved-state').textContent = 'Not saved'; toast('Browser storage is full or unavailable. Download your notes to keep them.'); }
}
function invalidateReminder(deadlineId) {
  const rows = storage.reminders();
  const keep = rows.filter(row => row.lectureId !== lecture.id || row.deadlineId !== deadlineId);
  if (keep.length === rows.length) return;
  try { storage.saveReminders(keep); toast('The old browser reminder was removed. Set a new one if needed. Calendar events must be updated in your calendar app.'); }
  catch { toast('Could not update browser reminders. Remove the old reminder in History.'); }
}
async function refreshSession() {
  try {
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    session = await response.json();
    $('access-panel').hidden = !session.configured || session.authenticated;
    $('setup-notice').hidden = session.configured;
    $('service-status').textContent = session.authenticated ? 'Groq AI · ready to study' : session.configured ? 'Groq AI · access code required' : 'AI setup pending';
    $('service-status').classList.toggle('ready', session.authenticated);
  } catch { session = {}; $('service-status').textContent = 'Server unavailable · check your connection'; }
}
$('access-form').addEventListener('submit', async event => {
  event.preventDefault(); message('access-error', '');
  const button = event.submitter; button.disabled = true;
  try { await api('session', { code: $('access-code').value }); $('access-code').value = ''; await refreshSession(); toast('AI is ready. Add your lecture below.'); }
  catch (error) { message('access-error', error.message); }
  finally { button.disabled = false; }
});
$('logout').onclick = async () => { try { await api('session', { logout: true }); await refreshSession(); show('upload'); } catch (error) { toast(error.message); } };
function stopWork() { controller?.abort(); controller = null; if (recorder?.state === 'recording') recorder.stop(); }
function home() { stopWork(); show('upload'); }
for (const id of ['home', 'history-new', 'ok-another']) $(id).onclick = home;
$('theme').onclick = () => {
  const isDark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  try { localStorage.setItem('lecture-theme', document.documentElement.dataset.theme); } catch { /* Theme still works without persistence. */ }
};
try { const theme = localStorage.getItem('lecture-theme'); if (theme) document.documentElement.dataset.theme = theme; } catch { /* Private storage may be unavailable. */ }
$('lecture-date').value = localDate();
function removeFile() { file = null; $('file-input').value = ''; $('pick-area').hidden = false; $('selected').hidden = true; }
function handleFile(next) {
  message('error', ''); if (!next) return;
  try { validateFile(next); } catch (error) { message('error', error.message); return; }
  file = next; $('lecture-text').value = '';
  $('file-name').textContent = next.name; $('file-badge').textContent = extension(next.name).toUpperCase();
  $('file-sub').textContent = `${(next.size / 1024 / 1024).toFixed(2)} MB`;
  $('pick-area').hidden = true; $('selected').hidden = false;
}
$('drop').onclick = () => $('file-input').click();
$('file-input').onchange = () => handleFile($('file-input').files[0]);
$('remove').onclick = removeFile;
for (const event of ['dragenter', 'dragover']) $('drop').addEventListener(event, e => { e.preventDefault(); $('drop').classList.add('over'); });
for (const event of ['dragleave', 'drop']) $('drop').addEventListener(event, e => { e.preventDefault(); $('drop').classList.remove('over'); });
$('drop').addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
$('lecture-text').oninput = () => { if ($('lecture-text').value.trim()) removeFile(); $('text-count').textContent = `${$('lecture-text').value.length.toLocaleString()} / 100,000 characters`; };
$('sample').onclick = () => {
  removeFile();
  const due = new Date(); due.setDate(due.getDate() + 7);
  $('lecture-text').value = `Today we learned about operating systems. An operating system connects the user and the computer hardware. It manages memory, processor time, files and input/output devices. Windows, macOS and Linux are common operating systems. System software helps the computer work. Application software helps people do specific tasks, such as writing a document or editing a photo. A compiler translates a whole program before it runs. An interpreter translates and runs code step by step. A process is a program that is running. The operating system shares CPU time between processes.\n\nSubmit your worksheet on operating systems by ${localDate(due)} at 18:00. Explain the four main functions and give two examples of application software. We will have a short quiz later, but the date has not been decided. Next week we will discuss computer networks.`;
  $('lecture-text').dispatchEvent(new Event('input'));
  toast('Sample notes added. Analyze them with the real AI.');
};
$('record').onclick = async () => {
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { message('error', 'This browser cannot record audio. Upload an audio file instead.'); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const parts = []; let bytes = 0; const started = Date.now();
    recorder.ondataavailable = event => { if (event.data.size) { parts.push(event.data); bytes += event.data.size; if (bytes > 48 * 1024 * 1024 && recorder.state === 'recording') recorder.stop(); } };
    recorder.onstop = () => {
      clearInterval(recordingTimer); stream.getTracks().forEach(track => track.stop());
      $('record').textContent = 'Record audio'; $('record-status').textContent = ''; $('analyze').disabled = false;
      const type = recorder.mimeType; const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      handleFile(new File(parts, `Lecture-${localDate()}.${ext}`, { type }));
    };
    recorder.onerror = () => { if (recorder.state !== 'inactive') recorder.stop(); message('error', 'Recording stopped unexpectedly. Check the saved audio before analyzing.'); };
    recorder.start(1000); $('record').textContent = 'Stop recording'; $('analyze').disabled = true;
    recordingTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      $('record-status').textContent = `Recording ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      if (seconds >= 1790 && recorder.state === 'recording') recorder.stop();
    }, 500);
  } catch { stream?.getTracks().forEach(track => track.stop()); message('error', 'Microphone access was not available. Allow it in browser settings or upload an audio file.'); }
};

$('analyze').onclick = async () => {
  message('error', '');
  if (!session.authenticated) { await refreshSession(); if (!session.authenticated) { message('error', session.configured ? 'Enter the site access code above to use AI.' : 'AI setup is not finished. Please contact the site owner.'); $('access-code').focus(); return; } }
  if (!$('consent').checked) { message('error', 'Confirm that you have permission to send this lecture for AI analysis.'); $('consent').focus(); return; }
  if (!validDate($('lecture-date').value)) { message('error', 'Choose the date of this lecture.'); return; }
  if (!file && !$('lecture-text').value.trim()) { message('error', 'Choose a file, record audio or paste your lecture text.'); return; }
  const run = new AbortController(); controller = run;
  const settings = { date: $('lecture-date').value, language: $('language').value, syllabus: $('syllabus').value.trim() };
  const filename = file?.name || 'Pasted lecture notes';
  const saveLocal = $('save-local').checked;
  $('proc-file').textContent = filename; progress(3, 'Starting…'); show('processing');
  try {
    const text = file ? await extract(file, { signal: run.signal, progress }) : validateText($('lecture-text').value);
    run.signal.throwIfAborted();
    const chunks = splitText(text), notes = [], deadlines = [];
    if (chunks.length > 1) {
      for (let i = 0; i < chunks.length; i++) {
        const p = 50 + 32 * i / chunks.length;
        progress(p, `Understanding section ${i + 1} of ${chunks.length}…`);
        const part = await api('analyze', { ...settings, mode: 'extract', text: chunks[i] }, { signal: run.signal, onWait: message => progress(p, message) });
        notes.push(part.notes); deadlines.push(...part.deadlines.map(({ title, quote, date, time }) => ({ title, quote, date, time })));
      }
    }
    if (notes.join('\n').length > 4500) {
      const groups = splitText(notes.join('\n')), condensed = [];
      for (let i = 0; i < groups.length; i++) {
        progress(83, `Combining section notes ${i + 1} of ${groups.length}…`);
        const part = await api('analyze', { ...settings, mode: 'extract', text: groups[i] }, { signal: run.signal, onWait: message => progress(83, message) });
        condensed.push(part.notes);
      }
      notes.splice(0, notes.length, ...condensed);
    }
    progress(86, 'Writing your study guide and practice questions…');
    const result = await api('analyze', { ...settings, mode: 'final', text, ...(notes.length ? { notes: notes.join('\n'), deadlines } : {}) }, { signal: run.signal, onWait: message => progress(86, message) });
    run.signal.throwIfAborted();
    lecture = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), filename, text, settings, result, checked: {}, answers: {}, saveLocal };
    save(); renderSummary(); show('summary');
  } catch (error) {
    if (controller !== run) return;
    show('upload');
    if (error.name !== 'AbortError') message('error', error.message || 'Could not analyze the lecture. Try again.');
    if (error.status === 401) await refreshSession();
  } finally { if (controller === run) controller = null; }
};
$('cancel').onclick = home;

function renderSummary() {
  $('h-sum').textContent = lecture.result.title; $('summary-text').textContent = lecture.result.summary;
  $('sum-file').textContent = `${lecture.filename} · Lecture: ${lecture.settings.date}`;
  $('saved-state').textContent = lecture.saveLocal ? 'Saved on this device' : 'Not saved · download to keep';
  $('topics').replaceChildren(...lecture.result.topics.map(t => el('li', t)));
  $('roadmap-basis').textContent = lecture.result.roadmapBasis;
  const titles = { review: '01 · Review what you learned', next: '02 · Study next', later: '03 · Explore more deeply' };
  $('roadmap').replaceChildren(...Object.entries(titles).map(([key, title]) => {
    const box = el('div'); box.append(el('h3', title));
    const list = el('ul'); list.append(...lecture.result.roadmap[key].map(t => el('li', t)));
    box.append(list); if (!list.childElementCount) box.append(el('p', 'No suggestions for this section.', 'muted')); return box;
  }));
  $('transcript').textContent = lecture.text;
  renderQuiz();
}
function renderQuiz() {
  $('quiz').replaceChildren();
  lecture.result.quiz.forEach((q, index) => {
    const field = el('fieldset', undefined, 'quiz-question'); field.append(el('legend', `${index + 1}. ${q.question}`));
    q.options.forEach((option, optionIndex) => {
      const label = el('label', undefined, 'quiz-option'), input = el('input'); input.type = 'radio'; input.name = `question-${index}`;
      input.checked = lecture.answers[index] === optionIndex;
      input.onchange = () => { lecture.answers[index] = optionIndex; save(); renderQuiz(); };
      label.append(input, el('span', option)); field.append(label);
    });
    if (lecture.answers[index] !== undefined) {
      const correct = lecture.answers[index] === q.answer;
      field.append(el('p', `${correct ? 'Correct!' : 'Try again.'} ${q.explanation}`, `quiz-feedback${correct ? ' correct' : ''}`));
    }
    $('quiz').append(field);
  });
  const correct = lecture.result.quiz.filter((q, i) => lecture.answers[i] === q.answer).length;
  $('quiz-score').textContent = lecture.result.quiz.length ? `${correct} of ${lecture.result.quiz.length} correct` : 'Not enough material for a useful quiz.';
}
function download(content, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = el('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 15000);
}
$('download-notes').onclick = () => {
  const r = lecture.result;
  const markdown = [`# ${r.title}`, `Lecture: ${lecture.settings.date}\nSource: ${lecture.filename}`, '## Summary', r.summary, '## Key ideas', ...r.topics.map(t => `- ${t}`), '## Study tasks', ...r.tasks.map(t => `- [ ] ${t}`), '## Deadlines — verify with your teacher', ...r.deadlines.filter(d => d.on).map(d => `- ${d.title}: ${d.date || 'Date not stated'} ${d.time}\n  Source: ${d.quote || 'Added by you'}`), '## Learning path', r.roadmapBasis, ...['review', 'next', 'later'].map(k => `### ${k}\n${r.roadmap[k].map(t => '- ' + t).join('\n')}`), '## Practice questions', ...r.quiz.map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n')}\nAnswer: ${String.fromCharCode(65 + q.answer)}. ${q.explanation}`), '## Extracted lecture text', lecture.text].join('\n\n');
  download(markdown, `Lecture-${lecture.settings.date}.md`, 'text/markdown;charset=utf-8');
};
$('to-deadlines').onclick = () => { renderDeadlines(); show('deadlines'); };
$('dl-back').onclick = () => { renderSummary(); show('summary'); };
function renderDeadlines() {
  message('dl-error', ''); $('no-deadlines').hidden = lecture.result.deadlines.length > 0;
  $('dl-list').replaceChildren(...lecture.result.deadlines.map(d => {
    const item = el('li', undefined, `dl${d.on ? '' : ' off'}`);
    const head = el('label', undefined, 'dl-head'), check = el('input'); check.type = 'checkbox'; check.checked = d.on;
    check.onchange = () => { d.on = check.checked; item.classList.toggle('off', !d.on); if (!d.on) invalidateReminder(d.id); save(); };
    head.append(check, el('span', d.title));
    const title = el('label', 'Task title', 'field'), titleInput = el('input'); titleInput.value = d.title; titleInput.maxLength = 200;
    titleInput.onchange = () => { d.title = titleInput.value.trim() || 'Untitled task'; head.lastChild.textContent = d.title; invalidateReminder(d.id); save(); }; title.append(titleInput);
    const dates = el('div', undefined, 'dl-date');
    for (const [field, label] of [['date', 'Due date'], ['time', 'Due time (your local time)']]) {
      const box = el('div'), lab = el('label', label), input = el('input'); input.id = `${d.id}-${field}`; lab.htmlFor = input.id; input.type = field; input.value = d[field];
      input.onchange = () => { d[field] = input.value; invalidateReminder(d.id); save(); };
      box.append(lab, input); dates.append(box);
    }
    item.append(head, el('p', d.quote ? `From the lecture: “${d.quote}”` : 'Added by you.', 'quote'), title, dates);
    if (!d.date || !d.time) item.append(el('p', 'Some details were not stated. Set a date and time to use reminders.', 'detect'));
    if (d.date && d.date < localDate()) item.append(el('p', 'This date has passed. Check it with your teacher.', 'detect'));
    return item;
  }));
}
$('add-deadline').onclick = () => { if (lecture.result.deadlines.length >= 20) return toast('You can keep up to 20 deadlines per lecture.'); lecture.result.deadlines.push({ id: crypto.randomUUID(), title: 'New task', quote: '', date: '', time: '', on: true }); save(); renderDeadlines(); };
$('to-todo').onclick = () => { save(); renderTodo(); show('todo'); };
function activeDeadlines() { return lecture.result.deadlines.filter(d => d.on).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')); }
function formatDue(d) { return d.date ? `${d.date}${d.time ? ` at ${d.time}` : ' · time not set'}` : 'Date not set'; }
function todoItem(id, title, sub) {
  const item = el('li'), label = el('label'), input = el('input'); input.type = 'checkbox'; input.checked = Boolean(lecture.checked[id]);
  input.onchange = () => { lecture.checked[id] = input.checked; if (input.checked) invalidateReminder(id); save(); };
  const text = el('span'); text.append(el('span', title, 't-title'), el('span', sub, 't-sub')); label.append(input, text); item.append(label); return item;
}
function renderTodo() {
  $('todo-dl').replaceChildren(...activeDeadlines().map(d => todoItem(d.id, d.title, formatDue(d))));
  if (!$('todo-dl').childElementCount) $('todo-dl').append(el('li', 'No assignment deadlines added.'));
  $('todo-rep').replaceChildren(...lecture.result.tasks.map((t, i) => todoItem(`study-${i}`, t, 'Suggested study task')));
}
$('todo-back').onclick = () => { renderDeadlines(); show('deadlines'); };
$('todo-summary').onclick = () => { renderSummary(); show('summary'); };
function renderReminder() {
  message('rem-notice', '');
  const eligible = activeDeadlines().filter(d => validDate(d.date) && validTime(d.time));
  $('turn-on').disabled = !eligible.length;
  $('rem-dl').replaceChildren(...eligible.map((d, i) => {
    const label = el('label', undefined, 'opt'), input = el('input'); input.type = 'radio'; input.name = 'deadline'; input.value = d.id; input.checked = i === 0;
    const text = el('span', d.title); text.append(el('span', formatDue(d), 'o-sub')); label.append(input, text); return label;
  }));
  if (!eligible.length) $('rem-dl').append(el('p', 'Set a date and time on a deadline first. Go back to tasks, then Edit deadlines.', 'notice'));
}
$('to-reminder').onclick = () => { renderReminder(); show('reminder'); };
$('rem-back').onclick = () => { renderTodo(); show('todo'); };
for (const input of document.querySelectorAll('input[name="how"]')) input.onchange = () => { $('turn-on').textContent = input.value === 'calendar' ? 'Download calendar file' : 'Save browser reminder'; };
$('turn-on').onclick = async () => {
  message('rem-notice', '');
  const d = lecture.result.deadlines.find(d => d.id === document.querySelector('input[name="deadline"]:checked')?.value);
  if (!d) return;
  const when = document.querySelector('input[name="when"]:checked').value;
  const mode = document.querySelector('input[name="how"]:checked').value;
  try {
    const at = reminderTime(d, when);
    if (at <= Date.now()) throw new Error('That reminder time has already passed. Choose a later deadline or a shorter reminder interval.');
    if (mode === 'calendar') {
      lastCalendar = { content: buildIcs(d, when, `${lecture.id}-${d.id}`), filename: `lecture-deadline-${d.id}.ics` };
      download(lastCalendar.content, lastCalendar.filename, 'text/calendar;charset=utf-8');
      $('cal-google').href = googleUrl(d);
    } else {
      if (!window.Notification) throw new Error('This browser does not support notifications. Use a calendar reminder.');
      if (await Notification.requestPermission() !== 'granted') throw new Error('Notifications were not allowed. Use a calendar reminder or change browser settings.');
      storage.saveReminders([...storage.reminders().filter(r => !(r.lectureId === lecture.id && r.deadlineId === d.id)), { id: crypto.randomUUID(), lectureId: lecture.id, deadlineId: d.id, title: d.title, at, due: formatDue(d), fired: false }]);
    }
    $('h-ok').textContent = mode === 'calendar' ? 'Your calendar file is ready' : 'Browser reminder saved';
    $('ok-box').replaceChildren(el('p', d.title), el('p', `Due ${formatDue(d)}. Reminder: ${when.toLowerCase()}.`), el('p', mode === 'calendar' ? 'Import the downloaded file and check the alarm in your calendar. If you use the Google Calendar draft, set its reminder and click Save there.' : 'Keep this page open for the notification. Your browser may delay it in a background tab.'));
    $('cal-actions').hidden = mode !== 'calendar'; show('success');
  } catch (error) { message('rem-notice', error.message); }
};
$('cal-again').onclick = () => { if (lastCalendar) download(lastCalendar.content, lastCalendar.filename, 'text/calendar;charset=utf-8'); };
$('ok-todo').onclick = () => { renderTodo(); show('todo'); };
function checkReminders() {
  const rows = storage.reminders(); let changed = false;
  for (const row of rows) if (!row.fired && row.at <= Date.now()) {
    row.fired = true; changed = true; toast(`Reminder: ${row.title} · Due ${row.due}`);
    if (window.Notification && Notification.permission === 'granted') {
      try { new Notification('Lecture+ reminder', { body: `${row.title} · Due ${row.due}`, tag: row.id }); } catch { /* The in-page reminder is still visible. */ }
    }
  }
  if (changed) try { storage.saveReminders(rows); } catch { /* No credentials or results are sent elsewhere. */ }
}
setInterval(checkReminders, 15000); window.addEventListener('focus', checkReminders);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });
function renderHistory() {
  const rows = storage.read(); $('history-list').replaceChildren();
  if (!rows.length) $('history-list').append(el('p', 'Your saved lectures will appear here.', 'card'));
  for (const row of rows) {
    if (!row.result?.title) continue;
    const box = el('div', undefined, 'history-row'), info = el('div'), open = el('button', row.result.title, 'history-title');
    open.onclick = () => { lecture = row; lecture.answers ||= {}; lecture.checked ||= {}; renderSummary(); show('summary'); };
    info.append(open, el('small', `${row.settings.date} · ${row.filename}`));
    const del = el('button', 'Delete', 'text-btn'); del.setAttribute('aria-label', `Delete ${row.result.title}`);
    del.onclick = () => { if (confirm('Delete this lecture and its browser reminders from this device?')) { storage.deleteLecture(row.id); if (lecture?.id === row.id) lecture.saveLocal = false; renderHistory(); } };
    box.append(info, del); $('history-list').append(box);
  }
  $('reminder-list').replaceChildren(...storage.reminders().map(row => {
    const box = el('div', undefined, 'history-row'); box.append(el('div', `${row.title} · ${new Date(row.at).toLocaleString()} · ${row.fired ? 'Shown' : 'Pending'}`));
    const cancel = el('button', 'Remove', 'text-btn'); cancel.onclick = () => { storage.saveReminders(storage.reminders().filter(r => r.id !== row.id)); renderHistory(); }; box.append(cancel); return box;
  }));
  if (!$('reminder-list').childElementCount) $('reminder-list').append(el('p', 'No browser reminders saved.', 'muted'));
}
$('history').onclick = () => { stopWork(); renderHistory(); show('history'); };
$('clear-history').onclick = () => { if (confirm('Delete all saved lectures, tasks and browser reminders on this device?')) { storage.clearAll(); if (lecture) lecture.saveLocal = false; renderHistory(); } };
window.addEventListener('beforeunload', event => { if (controller || recorder?.state === 'recording') { event.preventDefault(); event.returnValue = ''; } });
void refreshSession(); checkReminders();
