import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const databaseUrl = process.env.POSTGRES_URL_NON_POOLING;
if (!databaseUrl) throw new Error('POSTGRES_URL_NON_POOLING is missing. Pull Vercel environment variables first.');
const parsed = new URL(databaseUrl);
if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.endsWith('.supabase.com')) throw new Error('Refusing to run against a non-Supabase database host.');
parsed.searchParams.delete('sslmode');

const schemaPath = fileURLToPath(new URL('../db/schema.sql', import.meta.url));
const sql = await readFile(schemaPath, 'utf8');
const client = new pg.Client({ connectionString: parsed.toString(), ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(sql);
  const result = await client.query("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name in ('profiles','lectures','transcripts','analyses','topics','lecture_topics','questions','answer_options','quiz_attempts','attempt_answers','tasks','reminders')");
  if (result.rows[0]?.count !== 12) throw new Error(`Expected 12 application tables, found ${result.rows[0]?.count ?? 0}.`);
  console.log('Lecture+ schema applied and verified: 12 application tables.');
} finally {
  await client.end().catch(() => {});
}
