import './style.css';
import './database.css';
import { databaseStatus } from './cloud.mjs';

const tables = [
  ['profiles', 'Student profile and sync choice', ['PK id', 'display_name', 'email', 'cloud_sync_enabled']],
  ['lectures', 'One uploaded or recorded lecture', ['PK id', 'FK user_id', 'title', 'source_type', 'created_at']],
  ['transcripts', 'Extracted lecture text', ['PK id', 'FK lecture_id', 'content', 'word_count']],
  ['analyses', 'AI study guide in structured sections', ['PK id', 'FK lecture_id', 'summary', 'key_points JSON']],
  ['topics', 'Reusable topic names', ['PK id', 'name', 'description']],
  ['lecture_topics', 'Connects lectures and topics', ['PK id', 'FK lecture_id', 'FK topic_id', 'role', 'confidence']],
  ['questions', 'Quiz questions for a lecture', ['PK id', 'FK lecture_id', 'question_text', 'position']],
  ['answer_options', 'Possible answers for a question', ['PK id', 'FK question_id', 'option_text', 'is_correct']],
  ['quiz_attempts', 'One student quiz result', ['PK id', 'FK user_id', 'FK lecture_id', 'score']],
  ['attempt_answers', 'Selected answer for each question', ['PK id', 'FK attempt_id', 'FK question_id', 'FK selected_option_id']],
  ['tasks', 'Teacher work or AI practice', ['PK id', 'FK lecture_id', 'task_type', 'due_at', 'is_completed']],
  ['reminders', 'Reminder connected to a task', ['PK id', 'FK task_id', 'remind_at', 'channel', 'status']]
];

const grid = document.getElementById('table-grid');
for (const [name, purpose, fields] of tables) {
  const card = document.createElement('article'); card.className = 'schema-card';
  const heading = document.createElement('h3'); heading.textContent = name;
  const text = document.createElement('p'); text.textContent = purpose;
  const list = document.createElement('ul');
  for (const field of fields) { const item = document.createElement('li'); item.textContent = field; list.append(item); }
  card.append(heading, text, list); grid.append(card);
}

const root = document.documentElement;
document.getElementById('theme').onclick = () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('lecture-theme', root.dataset.theme); } catch {}
};
try { const theme = localStorage.getItem('lecture-theme'); if (theme) root.dataset.theme = theme; } catch {}

const status = document.getElementById('db-status');
databaseStatus().then(result => {
  status.classList.toggle('connected', Boolean(result.connected));
  status.querySelector('strong').textContent = result.connected ? 'Supabase database connected' : 'Database design ready · cloud connection pending';
  status.lastElementChild.textContent = `${result.table_count || 12} application tables`;
}).catch(() => { status.querySelector('strong').textContent = 'Database design ready · cloud check unavailable'; });

