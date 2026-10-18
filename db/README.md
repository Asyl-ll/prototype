# Lecture+ database

- `schema.sql` — complete PostgreSQL schema, Row Level Security policies and safe RPC functions.
- `lecture-plus.dbml` — editable ER model; import it into https://dbdiagram.io.
- `../supabase/migrations` — migration history applied to the real Supabase project.

The public ER diagram is generated from live Supabase metadata. The API returns only table, column and relationship names; it never returns student rows or secrets.

Apply the schema to the linked development project:

```powershell
npm run db:apply
```

`db:apply` applies SQL, exports fresh JSON/DBML files and verifies every relationship. Export without applying SQL:

```powershell
npm run db:export
```

Verify the live project, RLS isolation and cleanup:

```powershell
npm run test:cloud
npm run test:schema
```

Never commit `.env.local`, database passwords or service-role keys.
