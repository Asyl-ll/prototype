# Lecture+ learning flow redesign

## Goal

Make the result of lecture analysis easier to understand and present. The user should move through a clear sequence instead of seeing the summary, quiz, future topics, assignments and deadline editing in one dense page.

## User flow

The result flow is:

1. **Analysis** — explanation of the complete lecture.
2. **What is next** — likely future topics derived from the current lecture and optional course outline.
3. **Quiz** — a separate knowledge check.
4. **Tasks** — teacher assignments and optional AI practice, visually separated.
5. **Reminder** — calendar or browser reminder for an assignment with a confirmed date and time.

Every result screen has a visible **Back** button. Returning to an earlier screen preserves quiz answers, edited tasks, dates and completion state. The existing New lecture and History actions remain available.

## Complete lecture analysis

Audio transcription and document extraction remain unchanged. Long lecture text is divided into bounded sections. Each section produces structured notes containing:

- concepts and definitions;
- explanations and examples;
- relationships between ideas;
- teacher instructions and verbatim evidence;
- topics that may lead to later study.

The final synthesis uses the notes from every section. It produces a detailed but readable explanation with these blocks:

- short overview;
- main concepts;
- important explanations and examples;
- connections between concepts;
- points to review.

The final prompt must not treat early sections as more important than later sections. If any section fails, analysis stops with an actionable error instead of silently returning an incomplete lecture summary. The extracted transcript remains available in a disclosure block and in the Markdown export.

## Future topics

Future topics move to a separate screen. Each suggested topic contains:

- topic title;
- why it logically follows from the current lecture;
- the current concepts it builds on;
- basis: **Course outline** or **AI recommendation**;
- confidence: **High**, **Medium** or **Exploratory**.

Course-outline topics may be described as likely only when the uploaded outline supports them. Other topics are explicitly recommendations, never claims about what the teacher will teach. The screen also keeps a short Review first list so the student knows what foundation is needed.

## Quiz

Quiz becomes a separate screen after Future topics. It contains five multiple-choice questions when the lecture has enough material. Questions cover different parts of the lecture rather than repeating one concept. After choosing an option, the user sees:

- whether the answer is correct;
- a short explanation grounded in the lecture;
- the correct answer after an incorrect attempt.

The final state shows the score, a short recommendation based on mistakes, **Try again**, **Back**, and **Continue to tasks**. Try again clears only quiz answers. A short lecture may produce three questions; the UI explains this instead of padding the quiz with weak questions.

## Tasks and deadlines

Tasks is one compact screen with two clearly labelled groups:

### From the teacher

Only assignments supported by a verbatim lecture quote appear here. Each compact card shows the assignment title and, when known, a small due-date badge. The quote and date editor stay collapsed until the user selects **Check details**. Unknown dates remain blank. The user can disable an incorrect assignment or add one manually.

If no teacher assignment is found, show: “No teacher assignments found in this lecture.”

### Optional AI practice

AI-generated exercises appear as optional study recommendations. They never receive invented deadlines and are visibly labelled **Suggested by AI**. The user can tick them as complete, but they are not mixed with teacher instructions.

The Reminder action is enabled only for an active teacher assignment with a valid confirmed date and time. Editing or completing an assignment removes its obsolete browser reminder and explains that imported calendar events must be edited in the calendar app.

## Navigation and progress

The progress indicator represents five result stages after upload: **Analysis**, **Next**, **Quiz**, **Tasks**, **Reminder**. On mobile, short labels prevent overflow. Processing remains a temporary state between Upload and Analysis.

Back destinations are deterministic:

- Next → Analysis;
- Quiz → Next;
- Tasks → Quiz;
- Reminder → Tasks;
- Success → Tasks.

History opens the saved lecture at Analysis and retains all generated data and user state. Older saved lectures are normalized so missing new fields do not break the UI.

## Data model and API

The structured AI result adds:

- analysis sections for concepts, explanations, connections and review points;
- future topic objects with reason, prerequisites, basis and confidence;
- quiz questions with source-grounded explanations;
- teacher assignments separate from optional AI practice.

Server validation uses strict schemas and bounded string/array lengths. Verbatim evidence filtering remains mandatory for teacher assignments. AI output is treated as untrusted input and rendered through text nodes.

## Errors and limits

- Keep the current 30-minute / 50 MB audio and document limits.
- Show the current section number during long analysis.
- Retry only short temporary quota failures; show a clear message when the daily free quota is exhausted.
- Cancel aborts current requests and returns to Upload without saving a partial result.
- A result is saved only after the complete final synthesis validates successfully.

## Verification

- Unit tests cover the expanded schema, evidence filtering, future-topic basis/confidence and compatibility normalization.
- API tests reject incomplete section analysis and malformed final results.
- Browser tests cover Analysis → Next → Quiz → Tasks → Reminder, every Back button, quiz retry, compact task details, history restoration and mobile layout.
- Live Groq smoke testing uses synthetic lecture text and verifies that the final result represents concepts from the beginning, middle and end of the lecture.
- After local tests pass, deploy to the existing Vercel project and repeat text and audio smoke tests on the public URL.

## Out of scope for this revision

- Visual redesign beyond the layout needed for the new screens;
- internet research for future topics;
- LMS, email and account sync;
- background push notifications when the site is closed.
