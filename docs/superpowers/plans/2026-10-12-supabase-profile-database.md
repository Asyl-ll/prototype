# Lecture+ Database Implementation Plan

**Design:** `docs/superpowers/specs/2026-10-12-supabase-profile-database-design.md`

1. Add the 12-table PostgreSQL schema, indexes, trigger helpers, atomic lecture-save function, and RLS policies.
2. Add an environment-aware Supabase browser client that leaves the guest AI flow available when cloud setup is absent.
3. Add optional email/password authentication, cloud-sync consent, local-history import, and cloud lecture CRUD.
4. Replace the basic History view with a Profile view containing statistics, search, filters, richer cards, and lecture details.
5. Add a public Database Demo page with the ER model, table dictionary, business rules, scenario verification, and DBML download.
6. Add focused tests for lecture-to-database mapping and history statistics; run the full test, build, and audit checks.
7. Create the Supabase Free project, apply the schema, configure Vercel variables, and deploy production.
8. Generate the English B1 Word assignment with the ER diagram, editable source link, scenario, and team contribution; verify its rendering.

