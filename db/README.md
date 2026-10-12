# Lecture+ database

- `schema.sql` — complete PostgreSQL schema, Row Level Security policies and safe RPC functions.
- `lecture-plus.dbml` — editable ER model; import it into https://dbdiagram.io.
- `../supabase/migrations` — migration history applied to the real Supabase project.

Apply the schema to the linked development project:

```powershell
npm run db:apply
```

Verify the live project, RLS isolation and cleanup:

```powershell
npm run test:cloud
```

Never commit `.env.local`, database passwords or service-role keys.
