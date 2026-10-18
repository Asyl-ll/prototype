import pg from 'pg';

export const APPLICATION_TABLES = [
  'profiles', 'lectures', 'transcripts', 'analyses', 'topics', 'lecture_topics',
  'questions', 'answer_options', 'quiz_attempts', 'attempt_answers', 'tasks', 'reminders'
];

export function createDatabaseClient() {
  const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) throw new Error('POSTGRES_URL or POSTGRES_URL_NON_POOLING is missing.');
  const parsed = new URL(connectionString);
  if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.endsWith('.supabase.com')) {
    throw new Error('Refusing to connect to a non-Supabase database host.');
  }
  parsed.searchParams.delete('sslmode');
  return new pg.Client({ connectionString: parsed.toString(), ssl: { rejectUnauthorized: false } });
}

export async function loadSchemaMetadata(client) {
  const columnsResult = await client.query(`
    select
      c.relname as table_name,
      a.attname as column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
      not a.attnotnull as is_nullable,
      a.attnum as ordinal_position,
      exists (
        select 1 from pg_index i
        where i.indrelid = c.oid and i.indisprimary and a.attnum = any(i.indkey)
      ) as is_primary,
      exists (
        select 1 from pg_index i
        where i.indrelid = c.oid and i.indisunique and array_length(i.indkey, 1) = 1 and a.attnum = any(i.indkey)
      ) as is_unique
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1::text[])
    order by array_position($1::text[], c.relname), a.attnum
  `, [APPLICATION_TABLES]);

  const relationsResult = await client.query(`
    select
      tc.constraint_name,
      tc.table_name as child_table,
      kcu.column_name as child_column,
      ccu.table_name as parent_table,
      ccu.column_name as parent_column,
      rc.delete_rule,
      rc.update_rule
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_schema = tc.constraint_schema and kcu.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_schema = tc.constraint_schema and ccu.constraint_name = tc.constraint_name
    join information_schema.referential_constraints rc
      on rc.constraint_schema = tc.constraint_schema and rc.constraint_name = tc.constraint_name
    where tc.constraint_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
      and tc.table_name = any($1::text[])
    order by tc.table_name, kcu.ordinal_position
  `, [APPLICATION_TABLES]);

  const rlsResult = await client.query(`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1::text[])
  `, [APPLICATION_TABLES]);

  const relations = relationsResult.rows.map(row => ({
    name: row.constraint_name,
    childTable: row.child_table,
    childColumn: row.child_column,
    parentTable: row.parent_table,
    parentColumn: row.parent_column,
    deleteRule: row.delete_rule,
    updateRule: row.update_rule
  }));
  const foreignColumns = new Set(relations.map(relation => `${relation.childTable}.${relation.childColumn}`));
  const rls = new Map(rlsResult.rows.map(row => [row.table_name, row.rls_enabled]));
  const tableColumns = new Map(APPLICATION_TABLES.map(name => [name, []]));
  for (const row of columnsResult.rows) {
    tableColumns.get(row.table_name)?.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      primaryKey: row.is_primary,
      unique: row.is_unique,
      foreignKey: foreignColumns.has(`${row.table_name}.${row.column_name}`)
    });
  }

  const tables = APPLICATION_TABLES
    .filter(name => tableColumns.get(name)?.length)
    .map(name => ({ name, rlsEnabled: Boolean(rls.get(name)), columns: tableColumns.get(name) }));

  return {
    generatedAt: new Date().toISOString(),
    source: 'Supabase PostgreSQL · public schema',
    tableCount: tables.length,
    relationCount: relations.length,
    tables,
    relations
  };
}

function dbmlType(type) {
  return type
    .replace(/^timestamp with time zone$/i, 'timestamptz')
    .replace(/^timestamp without time zone$/i, 'timestamp')
    .replace(/^character varying/i, 'varchar')
    .replace(/^boolean$/i, 'boolean')
    .replace(/^integer$/i, 'integer');
}

export function metadataToDbml(metadata) {
  const relationByColumn = new Map(metadata.relations.map(relation => [
    `${relation.childTable}.${relation.childColumn}`,
    relation
  ]));
  const lines = [
    'Project LecturePlus {',
    "  database_type: 'PostgreSQL'",
    "  Note: 'Generated from the live Supabase public schema. All relations are 1:N / N:1.'",
    '}',
    ''
  ];
  for (const table of metadata.tables) {
    lines.push(`Table ${table.name} {`);
    for (const column of table.columns) {
      const flags = [];
      if (column.primaryKey) flags.push('pk');
      if (!column.nullable) flags.push('not null');
      if (column.unique && !column.primaryKey) flags.push('unique');
      const relation = relationByColumn.get(`${table.name}.${column.name}`);
      if (relation) flags.push(`ref: > ${relation.parentTable}.${relation.parentColumn}`);
      lines.push(`  ${column.name} ${dbmlType(column.type)}${flags.length ? ` [${flags.join(', ')}]` : ''}`);
    }
    lines.push('}', '');
  }
  return `${lines.join('\n').trim()}\n`;
}
