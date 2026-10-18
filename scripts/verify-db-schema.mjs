import assert from 'node:assert/strict';
import { APPLICATION_TABLES, createDatabaseClient, loadSchemaMetadata } from '../api/lib/db-schema-metadata.mjs';

const expectedRelations = [
  'analyses.lecture_id>lectures.id',
  'answer_options.question_id>questions.id',
  'attempt_answers.attempt_id>quiz_attempts.id',
  'attempt_answers.question_id>questions.id',
  'attempt_answers.selected_option_id>answer_options.id',
  'lecture_topics.lecture_id>lectures.id',
  'lecture_topics.topic_id>topics.id',
  'lectures.user_id>profiles.id',
  'questions.lecture_id>lectures.id',
  'quiz_attempts.lecture_id>lectures.id',
  'quiz_attempts.user_id>profiles.id',
  'reminders.task_id>tasks.id',
  'tasks.lecture_id>lectures.id',
  'transcripts.lecture_id>lectures.id'
].sort();

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const client = createDatabaseClient();
try {
  await client.connect();
  const metadata = await loadSchemaMetadata(client);
  assert.deepEqual(metadata.tables.map(table => table.name).sort(), [...APPLICATION_TABLES].sort(), 'The public application table list changed.');
  assert.deepEqual(metadata.relations.map(relation => `${relation.childTable}.${relation.childColumn}>${relation.parentTable}.${relation.parentColumn}`).sort(), expectedRelations, 'Foreign-key relations do not match the Lecture+ model.');
  assert.ok(metadata.tables.every(table => table.rlsEnabled), 'RLS must be enabled on every application table.');

  const tableByName = new Map(metadata.tables.map(table => [table.name, table]));
  for (const relation of metadata.relations) {
    const childColumn = tableByName.get(relation.childTable)?.columns.find(column => column.name === relation.childColumn);
    assert.ok(childColumn && !childColumn.unique, `${relation.childTable}.${relation.childColumn} is unique, so the relation is 1:1 instead of 1:N.`);
    const child = quoteIdentifier(relation.childTable);
    const childKey = quoteIdentifier(relation.childColumn);
    const parent = quoteIdentifier(relation.parentTable);
    const parentKey = quoteIdentifier(relation.parentColumn);
    const orphanResult = await client.query(`select count(*)::int as count from public.${child} c left join public.${parent} p on p.${parentKey} = c.${childKey} where c.${childKey} is not null and p.${parentKey} is null`);
    assert.equal(orphanResult.rows[0].count, 0, `Orphan rows found for ${relation.childTable}.${relation.childColumn}.`);
  }
  console.log(`Schema verification passed: ${metadata.tableCount} tables, ${metadata.relationCount} one-to-many relations, RLS enabled, no orphan rows.`);
} finally {
  await client.end().catch(() => {});
}
