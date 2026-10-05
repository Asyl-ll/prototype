const KEY = 'lecture-plus-history-v1', REMINDERS = 'lecture-plus-reminders-v1';
export function read(key = KEY) {
  try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export function saveLecture(lecture) {
  const rows = read().filter(row => row.id !== lecture.id);
  localStorage.setItem(KEY, JSON.stringify([lecture, ...rows].slice(0, 10)));
}
export function clearAll() { localStorage.removeItem(KEY); localStorage.removeItem(REMINDERS); }
export function reminders() { return read(REMINDERS); }
export function saveReminders(rows) { localStorage.setItem(REMINDERS, JSON.stringify(rows.slice(-40))); }
export function deleteLecture(id) {
  localStorage.setItem(KEY, JSON.stringify(read().filter(row => row.id !== id)));
  saveReminders(reminders().filter(r => r.lectureId !== id));
}
