import { validDate, validTime } from './content.mjs';
export const OFFSETS = { '1 day before': 86400000, '3 hours before': 10800000, '1 hour before': 3600000, 'At the deadline': 0 };
export function dueDate(deadline) {
  if (!validDate(deadline.date) || !validTime(deadline.time)) throw new Error('Choose a valid date and time for this deadline.');
  const d = new Date(`${deadline.date}T${deadline.time}:00`);
  if (d.getHours() !== Number(deadline.time.slice(0, 2))) throw new Error('This local time does not exist due to a clock change. Choose another time.');
  return d;
}
export function reminderTime(deadline, when) {
  if (!(when in OFFSETS)) throw new Error('Choose a reminder time.');
  return dueDate(deadline).getTime() - OFFSETS[when];
}
function stamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function escape(value) { return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function fold(line) {
  const encoder = new TextEncoder(); let bytes = 0, result = '';
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (bytes + length > 74) { result += '\r\n '; bytes = 1; }
    result += char; bytes += length;
  }
  return result;
}
export function buildIcs(deadline, when, uid, now = new Date()) {
  const due = dueDate(deadline);
  const trigger = { '1 day before': '-P1D', '3 hours before': '-PT3H', '1 hour before': '-PT1H', 'At the deadline': 'PT0S' }[when];
  if (!trigger) throw new Error('Choose a reminder time.');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lecture Plus//Study Planner//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${String(uid).replace(/[^a-zA-Z0-9-]/g, '')}@lecture-plus`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(due)}`, 'DURATION:PT15M',
    `SUMMARY:${escape(deadline.title)}`, `DESCRIPTION:${escape(`Check this deadline with your teacher.\nSource: ${deadline.quote || 'Added by you'}`)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escape(deadline.title)}`, `TRIGGER:${trigger}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', ''
  ].map(fold).join('\r\n');
}
export function googleUrl(deadline) {
  const due = dueDate(deadline);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: deadline.title, dates: `${stamp(due)}/${stamp(new Date(due.getTime() + 900000))}`, details: `From Lecture+. Check the date and set your reminder before saving.\n${deadline.quote || ''}` });
  return `https://calendar.google.com/calendar/render?${params}`;
}
