# Lecture+ working presentation build

The user selected the existing prototype, Vercel hosting and Groq Free, with a presentation on 6 October. Preserve its visual style and four-step flow. API credentials belong only in server environment variables. The key posted in chat must be replaced.

## Implementation

- Vite and browser JavaScript keep the existing accessible layout. Node server functions provide authenticated Groq requests on Vercel. A small local development server uses the same handlers.
- Input: audio file or microphone recording, PDF with selectable text, DOCX, PPTX, TXT, pasted notes. Optional course outline, lecture date and output language. Browser document extraction and short WAV chunks avoid the Vercel request-size limit.
- Processing: real transcription, bounded text sections, evidence-based extraction, then synthesis into a summary, study tasks, short quiz and three-stage learning path. Progress reflects completed operations. Cancellation and quota errors must be visible. Lecture content is untrusted data, never instructions to the application.
- Output: editable deadline dates and times with source quotations, tasks with completion state, answer feedback, transcript and Markdown download. Without a syllabus, next topics are recommendations, never factual predictions.
- Local history persists completed results, task state and reminders on this device. No user accounts or cloud sync are implied. Audio is not saved. Users can delete local history.
- Calendar export produces ICS with an alarm; Google Calendar opens an event draft. The user must save/import it. Browser notifications only work while the page is open and resume overdue reminders when reopened. No fake LMS integration.
- Protect AI endpoints with an access code and signed HttpOnly session cookie, same-origin validation, bounded payloads and request throttling. Groq Free quotas remain shared across the account.
- Explicit limits: audio up to 30 minutes / 50 MB, documents up to 15 MB and 100 pages/slides, extracted text up to 100,000 characters; adjust only after verification. Scanned documents need text extraction elsewhere.

## Validation

Test malformed model output, missing secrets, authentication, payload limits, unsupported/empty input, source-evidence filtering, reminder scheduling, calendar escaping and date validation. Run browser checks for upload/paste, results, deadlines, quiz, persistence, calendar and mobile layout with a clearly separate mocked provider. Live Groq testing requires a replacement key. Deployment requires Vercel login; do not claim it is deployed until a public URL is verified.

## Sequence

1. Build server and extraction pipeline.
2. Wire the current UI and add study tools.
3. Test server and browser flows.
4. Add credentials securely, test real AI, then deploy and verify the public app.
