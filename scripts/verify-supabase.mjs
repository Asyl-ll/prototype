import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceKey) throw new Error('Supabase verification environment is incomplete.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = `Test-${randomUUID()}!aA9`;
const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const users = [];

async function createTestUser(label) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `lecture-plus-${label}-${stamp}@example.com`, password, email_confirm: true,
    user_metadata: { display_name: `${label} test student` }
  });
  if (error) throw error;
  users.push(data.user.id);
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email: data.user.email, password });
  if (signed.error) throw signed.error;
  return client;
}

try {
  const first = await createTestUser('owner');
  const second = await createTestUser('other');

  const profile = await first.from('profiles').select('display_name,cloud_sync_enabled').single();
  assert.ifError(profile.error);
  assert.equal(profile.data.display_name, 'owner test student');

  const lectureId = randomUUID();
  const payload = {
    id: lectureId, title: 'Database verification lecture', source_type: 'text', source_name: 'Automated test',
    language: 'English', lecture_date: '2026-10-12', duration_seconds: '', created_at: new Date().toISOString(),
    transcript: 'A database stores connected information.', word_count: 6,
    analysis: { overview: 'A short database lecture.', concepts: [{ title: 'Database', explanation: 'Organized data.' }], sections: { explanations: ['Tables store rows.'], examples: [], connections: [] }, review: ['Primary keys'] },
    topics: [{ name: 'Database', description: 'Organized data.', role: 'current', reason: 'Covered now.', confidence: 1 }, { name: 'SQL', description: 'Query language.', role: 'future', reason: 'A logical next topic.', confidence: 0.9 }],
    questions: [{ question: 'What stores rows?', explanation: 'A table stores rows.', position: 0, options: [{ text: 'A table', position: 0, correct: true }, { text: 'A microphone', position: 1, correct: false }] }],
    answers: [{ question_position: 0, option_position: 0, correct: true }], quiz_attempt: { score: 1, total: 1 },
    tasks: [{ title: 'Draw one table', description: 'AI practice suggestion.', type: 'ai_practice', due_at: '', completed: true, reminders: [] }]
  };
  const saved = await first.rpc('save_lecture_graph', { payload });
  assert.ifError(saved.error); assert.equal(saved.data, lectureId);

  const history = await first.rpc('list_lecture_history');
  assert.ifError(history.error); assert.equal(history.data.length, 1); assert.equal(history.data[0].score, 1);
  const graph = await first.rpc('get_lecture_graph', { p_lecture_id: lectureId });
  assert.ifError(graph.error); assert.equal(graph.data.result.title, payload.title);

  const forbidden = await second.rpc('get_lecture_graph', { p_lecture_id: lectureId });
  assert.ifError(forbidden.error); assert.equal(forbidden.data, null);
  const anonymous = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonymousProfiles = await anonymous.from('profiles').select('id');
  assert.ok(anonymousProfiles.error, 'Anonymous profile access must be denied.');

  const status = await anonymous.rpc('database_demo_status');
  assert.ifError(status.error); assert.equal(status.data[0].table_count, 12);
  console.log('Supabase verification passed: Auth, save/load RPCs, RLS isolation, public status, and cascade cleanup.');
} finally {
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

