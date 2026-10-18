import { createDatabaseClient, loadSchemaMetadata } from './lib/db-schema-metadata.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const client = createDatabaseClient();
  try {
    await client.connect();
    const metadata = await loadSchemaMetadata(client);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json(metadata);
  } catch {
    return res.status(503).json({ error: 'Live schema is temporarily unavailable.' });
  } finally {
    await client.end().catch(() => {});
  }
}
