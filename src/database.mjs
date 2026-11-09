import './style.css';
import './database.css';
import mermaid from 'mermaid';
import { databaseStatus } from './cloud.mjs';

const purposeByTable = {
  profiles: 'Student profile and sync choice',
  lectures: 'One uploaded or recorded lecture',
  transcripts: 'Extracted lecture text',
  analyses: 'AI study guide in structured sections',
  topics: 'Reusable current and future topics',
  lecture_topics: 'Links a lecture to its topics',
  questions: 'Quiz questions for a lecture',
  answer_options: 'Possible answers for a question',
  quiz_attempts: 'One student quiz result',
  attempt_answers: 'Selected answer for each question',
  tasks: 'Teacher work or AI practice',
  reminders: 'Reminder connected to a task'
};

const root = document.documentElement;
const grid = document.getElementById('table-grid');
const diagram = document.getElementById('er-diagram');
const meta = document.getElementById('er-meta');
let schema;

function activeTheme() {
  if (root.dataset.theme) return root.dataset.theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function typeToken(value) {
  return String(value).replaceAll(/[^a-zA-Z0-9_]/g, '_').replaceAll(/_+/g, '_');
}

function diagramSource(data) {
  const lines = ['erDiagram'];
  for (const relation of data.relations) {
    lines.push(`  ${relation.parentTable} ||--o{ ${relation.childTable} : "${relation.childColumn}"`);
  }
  for (const table of data.tables) {
    lines.push(`  ${table.name} {`);
    for (const column of table.columns) {
      const keys = [column.primaryKey && 'PK', column.foreignKey && 'FK', column.unique && !column.primaryKey && 'UK'].filter(Boolean).join(',');
      lines.push(`    ${typeToken(column.type)} ${column.name}${keys ? ` ${keys}` : ''}`);
    }
    lines.push('  }');
  }
  return lines.join('\n');
}

function renderDictionary(data) {
  grid.replaceChildren();
  for (const table of data.tables) {
    const card = document.createElement('article'); card.className = 'schema-card';
    const heading = document.createElement('h3'); heading.textContent = table.name;
    const text = document.createElement('p'); text.textContent = purposeByTable[table.name] || 'Application data';
    const list = document.createElement('ul');
    for (const column of table.columns) {
      const labels = [column.primaryKey && 'PK', column.foreignKey && 'FK'].filter(Boolean).join(' · ');
      const item = document.createElement('li');
      item.textContent = `${labels ? `${labels} ` : ''}${column.name}: ${column.type}${column.nullable ? ' · optional' : ''}`;
      list.append(item);
    }
    card.append(heading, text, list); grid.append(card);
  }
}

async function renderDiagram(data) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: activeTheme() === 'dark' ? 'dark' : 'neutral',
    er: { useMaxWidth: false, layoutDirection: 'TB', minEntityWidth: 150, minEntityHeight: 75 }
  });
  const id = `lecture-plus-er-${Date.now()}`;
  const { svg, bindFunctions } = await mermaid.render(id, diagramSource(data));
  diagram.innerHTML = svg;
  bindFunctions?.(diagram);
  meta.innerHTML = `<strong>${data.tableCount} tables · ${data.relationCount} one-to-many relations.</strong> Source: ${data.source}. Updated ${new Date(data.generatedAt).toLocaleString()}. Supabase <code>auth.users</code> is external.`;
}

async function loadSchema(force = false) {
  diagram.innerHTML = '<p class="muted">Loading the live database schema…</p>';
  try {
    const url = force ? `/api/schema?refresh=${Date.now()}` : '/api/schema';
    let response = await fetch(url, { cache: force ? 'reload' : 'default' });
    if (!response.ok) response = await fetch('/lecture-plus-schema.json', { cache: force ? 'reload' : 'default' });
    if (!response.ok) throw new Error('Schema could not be loaded.');
    schema = await response.json();
    renderDictionary(schema);
    await renderDiagram(schema);
  } catch {
    diagram.innerHTML = '<div class="er-error"><p><strong>The live diagram is temporarily unavailable.</strong><br>Download the editable DBML above or try again.</p></div>';
  }
}

document.getElementById('refresh-er').onclick = () => loadSchema(true);
document.getElementById('theme').onclick = async () => {
  const dark = activeTheme() === 'dark';
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('lecture-theme', root.dataset.theme); } catch {}
  if (schema) await renderDiagram(schema);
};
try { const theme = localStorage.getItem('lecture-theme'); if (theme) root.dataset.theme = theme; } catch {}

loadSchema();

const status = document.getElementById('db-status');
databaseStatus().then(result => {
  status.classList.toggle('connected', Boolean(result.connected));
  status.querySelector('strong').textContent = result.connected ? 'Supabase database connected' : 'Database design ready · cloud connection pending';
  status.lastElementChild.textContent = `${result.table_count || 12} application tables`;
}).catch(() => { status.querySelector('strong').textContent = 'Database design ready · cloud check unavailable'; });
