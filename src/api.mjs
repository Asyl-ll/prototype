export async function api(path, body, { signal, onWait } = {}) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body), signal });
    let data;
    try { data = await response.json(); } catch { throw new Error('The server did not return a result. Please try again.'); }
    if (response.ok) return data;
    if (response.status === 429 && onWait && attempt < 2 && data.retryAfter <= 90) {
      const seconds = Math.max(5, data.retryAfter || 60);
      for (let left = seconds; left > 0; left--) {
        onWait(`Free AI limit: waiting ${left}s before retrying…`);
        await pause(1000, signal);
      }
      continue;
    }
    const error = new Error(data.error || 'Could not complete the request.');
    error.status = response.status;
    throw error;
  }
}
export function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
