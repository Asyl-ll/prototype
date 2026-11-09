window.extractionResult = null;
(async () => {
  const { extract } = await import('/src/extract.mjs');
  const results = [];
  for (const name of ['lecture.txt', 'lecture.pdf', 'lecture.docx', 'lecture.pptx', 'tone.wav']) {
    const response = await fetch('/test-results/fixtures/' + name);
    const file = new File([await response.arrayBuffer()], name);
    const text = await extract(file, { signal: new AbortController().signal, progress() {} });
    if (!text.includes('Operating systems') || !text.includes('2030-10-12')) throw new Error('Extraction failed: ' + name);
    results.push({ name, length: text.length, passed: true });
  }
  window.extractionResult = results;
})().catch(error => { window.extractionResult = { error: error.message, stack: error.stack }; });
'Extraction checks started'
