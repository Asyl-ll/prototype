-- Make every relationship in the 12-table application ER model 1:N / N:1.
-- Existing Lecture+ behavior still saves one current transcript and analysis,
-- while the schema can keep multiple versions in the future.

alter table public.transcripts
  drop constraint if exists transcripts_lecture_id_key;

alter table public.analyses
  drop constraint if exists analyses_lecture_id_key;

create index if not exists transcripts_lecture_idx
  on public.transcripts(lecture_id);

create index if not exists analyses_lecture_idx
  on public.analyses(lecture_id);
