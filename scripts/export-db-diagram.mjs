import { copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDatabaseClient, loadSchemaMetadata, metadataToDbml } from '../api/lib/db-schema-metadata.mjs';

const client = createDatabaseClient();
try {
  await client.connect();
  const metadata = await loadSchemaMetadata(client);
  const root = new URL('../', import.meta.url);
  const json = `${JSON.stringify(metadata, null, 2)}\n`;
  const dbml = metadataToDbml(metadata);
  await Promise.all([
    writeFile(fileURLToPath(new URL('public/lecture-plus-schema.json', root)), json),
    writeFile(fileURLToPath(new URL('db/lecture-plus.dbml', root)), dbml),
    writeFile(fileURLToPath(new URL('public/lecture-plus.dbml', root)), dbml),
    copyFile(fileURLToPath(new URL('db/schema.sql', root)), fileURLToPath(new URL('public/lecture-plus-schema.sql', root)))
  ]);
  console.log(`Exported live diagram metadata: ${metadata.tableCount} tables, ${metadata.relationCount} relations.`);
} finally {
  await client.end().catch(() => {});
}
