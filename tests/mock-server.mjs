// Isolated test server only. Production never imports this file.
import { source, studyGuide } from './fixture.mjs';
process.env.GROQ_API_KEY = 'test-provider-only';
process.env.APP_ACCESS_CODE = 'test-only-access-code';
process.env.PORT = '5174';
const actualFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.groq.com/')) {
    if (String(url).includes('/audio/')) return Response.json({ text: source });
    const request = JSON.parse(init.body), input = JSON.parse(request.messages[1].content);
    const result = request.response_format.json_schema.name === 'lecture_section'
      ? { notes: 'An OS manages memory, processes, files and devices.', deadlines: studyGuide.deadlines }
      : { ...studyGuide, summary: `MOCK TEST RESULT — not real AI. ${studyGuide.summary}`, deadlines: input.lecture.includes(studyGuide.deadlines[0].quote) ? studyGuide.deadlines : [] };
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });
  }
  return actualFetch(url, init);
};
await import('../scripts/dev.mjs');
