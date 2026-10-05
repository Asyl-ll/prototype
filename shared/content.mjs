export const MAX_TEXT = 100_000;
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validTime(value) { return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function hasEvidence(text, quote) {
  const normalize = s => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  return typeof quote === 'string' && quote.trim().length >= 8 && normalize(text).includes(normalize(quote));
}
export function groundedDeadlines(items, source) {
  const seen = new Set();
  return items.filter(d => hasEvidence(source, d.quote)).filter(d => {
    const key = d.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 20).map((d, index) => ({ ...d, id: `deadline-${index}`, date: validDate(d.date) ? d.date : '', time: validTime(d.time) ? d.time : '', on: true }));
}
export function splitText(text, size = 4000) {
  const parts = []; let offset = 0;
  while (offset < text.length) {
    let end = Math.min(offset + size, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end));
      if (boundary > offset + size / 2) end = boundary + 1;
      const remainder = text.length - end;
      if (remainder > 0 && remainder < 30) end -= 30 - remainder;
    }
    parts.push(text.slice(offset, end)); offset = end;
  }
  return parts;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
