-- Lecture+ database schema for Supabase PostgreSQL.
-- Run this file once in the Supabase SQL Editor.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  email text not null,
  avatar_url text,
  cloud_sync_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('audio', 'file', 'text')),
  source_name text,
  language text not null default 'English',
  lecture_date date not null default current_date,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  content text not null,
  word_count integer not null default 0 check (word_count >= 0),
  detected_language text,
  created_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  summary text not null,
  key_points jsonb not null default '[]'::jsonb,
  explanation_sections jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  model_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.lecture_topics (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete restrict,
  role text not null check (role in ('current', 'future')),
  reason text,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  unique (lecture_id, topic_id, role)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  question_text text not null,
  explanation text,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (lecture_id, position)
);

create table if not exists public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position integer not null check (position >= 0),
  unique (question_id, position)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  completed_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_id uuid not null references public.answer_options(id) on delete restrict,
  is_correct boolean not null,
  unique (attempt_id, question_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null check (task_type in ('teacher', 'ai_practice')),
  due_at timestamptz,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null check (channel in ('in_app', 'calendar')),
  status text not null default 'planned' check (status in ('planned', 'sent', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Keep the application ER model limited to 1:N / N:1 relationships.
-- A lecture may keep several transcript or analysis versions.
alter table public.transcripts drop constraint if exists transcripts_lecture_id_key;
alter table public.analyses drop constraint if exists analyses_lecture_id_key;

create index if not exists lectures_user_created_idx on public.lectures(user_id, created_at desc);
create index if not exists transcripts_lecture_idx on public.transcripts(lecture_id);
create index if not exists analyses_lecture_idx on public.analyses(lecture_id);
create index if not exists lecture_topics_lecture_idx on public.lecture_topics(lecture_id);
create index if not exists questions_lecture_idx on public.questions(lecture_id, position);
create index if not exists attempts_user_lecture_idx on public.quiz_attempts(user_id, lecture_id, completed_at desc);
create index if not exists tasks_lecture_idx on public.tasks(lecture_id);
create index if not exists reminders_task_idx on public.reminders(task_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists lectures_touch_updated_at on public.lectures;
create trigger lectures_touch_updated_at before update on public.lectures
for each row execute function public.touch_updated_at();

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'Student'), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_created_profile on auth.users;
create trigger auth_user_created_profile after insert on auth.users
for each row execute function private.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.lectures enable row level security;
alter table public.transcripts enable row level security;
alter table public.analyses enable row level security;
alter table public.topics enable row level security;
alter table public.lecture_topics enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;

drop policy if exists profiles_own_all on public.profiles;
create policy profiles_own_all on public.profiles for all to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists lectures_own_all on public.lectures;
create policy lectures_own_all on public.lectures for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists transcripts_own_all on public.transcripts;
create policy transcripts_own_all on public.transcripts for all to authenticated
using (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())));

drop policy if exists analyses_own_all on public.analyses;
create policy analyses_own_all on public.analyses for all to authenticated
using (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())));

drop policy if exists topics_authenticated_read on public.topics;
create policy topics_authenticated_read on public.topics for select to authenticated using (true);

drop policy if exists lecture_topics_own_all on public.lecture_topics;
create policy lecture_topics_own_all on public.lecture_topics for all to authenticated
using (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())));

drop policy if exists questions_own_all on public.questions;
create policy questions_own_all on public.questions for all to authenticated
using (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())));

drop policy if exists options_own_all on public.answer_options;
create policy options_own_all on public.answer_options for all to authenticated
using (exists (select 1 from public.questions q join public.lectures l on l.id = q.lecture_id where q.id = question_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.questions q join public.lectures l on l.id = q.lecture_id where q.id = question_id and l.user_id = (select auth.uid())));

drop policy if exists attempts_own_all on public.quiz_attempts;
create policy attempts_own_all on public.quiz_attempts for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists attempt_answers_own_all on public.attempt_answers;
create policy attempt_answers_own_all on public.attempt_answers for all to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())))
with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

drop policy if exists tasks_own_all on public.tasks;
create policy tasks_own_all on public.tasks for all to authenticated
using (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.lectures l where l.id = lecture_id and l.user_id = (select auth.uid())));

drop policy if exists reminders_own_all on public.reminders;
create policy reminders_own_all on public.reminders for all to authenticated
using (exists (select 1 from public.tasks t join public.lectures l on l.id = t.lecture_id where t.id = task_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.tasks t join public.lectures l on l.id = t.lecture_id where t.id = task_id and l.user_id = (select auth.uid())));

-- Save or replace one complete lecture graph in a single transaction.
create or replace function private.save_lecture_graph(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := (select auth.uid());
  lecture_uuid uuid := (payload ->> 'id')::uuid;
  question_row jsonb;
  option_row jsonb;
  topic_row jsonb;
  task_row jsonb;
  reminder_row jsonb;
  answer_row jsonb;
  question_uuid uuid;
  option_uuid uuid;
  attempt_uuid uuid;
  task_uuid uuid;
  topic_uuid uuid;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;

  insert into public.lectures (id, user_id, title, source_type, source_name, language, lecture_date, duration_seconds, status, created_at)
  values (
    lecture_uuid, owner_id, payload ->> 'title', payload ->> 'source_type', payload ->> 'source_name',
    coalesce(payload ->> 'language', 'English'), coalesce((payload ->> 'lecture_date')::date, current_date), nullif(payload ->> 'duration_seconds', '')::integer,
    'ready', coalesce((payload ->> 'created_at')::timestamptz, now())
  )
  on conflict (id) do update set
    title = excluded.title, source_type = excluded.source_type, source_name = excluded.source_name,
    language = excluded.language, lecture_date = excluded.lecture_date, duration_seconds = excluded.duration_seconds, status = 'ready'
  where public.lectures.user_id = owner_id;

  if not exists (select 1 from public.lectures where id = lecture_uuid and user_id = owner_id) then
    raise exception 'Lecture is owned by another user';
  end if;

  delete from public.transcripts where lecture_id = lecture_uuid;
  delete from public.analyses where lecture_id = lecture_uuid;
  delete from public.lecture_topics where lecture_id = lecture_uuid;
  delete from public.questions where lecture_id = lecture_uuid;
  delete from public.quiz_attempts where lecture_id = lecture_uuid and user_id = owner_id;
  delete from public.tasks where lecture_id = lecture_uuid;

  insert into public.transcripts (lecture_id, content, word_count, detected_language)
  values (lecture_uuid, coalesce(payload ->> 'transcript', ''), coalesce((payload ->> 'word_count')::integer, 0), payload ->> 'language');

  insert into public.analyses (lecture_id, summary, key_points, explanation_sections, recommended_actions, model_name)
  values (
    lecture_uuid, coalesce(payload #>> '{analysis,overview}', ''),
    coalesce(payload #> '{analysis,concepts}', '[]'::jsonb),
    coalesce(payload #> '{analysis,sections}', '[]'::jsonb),
    coalesce(payload #> '{analysis,review}', '[]'::jsonb), payload ->> 'model_name'
  );

  for topic_row in select * from jsonb_array_elements(coalesce(payload -> 'topics', '[]'::jsonb)) loop
    insert into public.topics (name, description)
    values (lower(trim(topic_row ->> 'name')), nullif(topic_row ->> 'description', ''))
    on conflict (name) do update set description = coalesce(public.topics.description, excluded.description)
    returning id into topic_uuid;
    insert into public.lecture_topics (lecture_id, topic_id, role, reason, confidence)
    values (lecture_uuid, topic_uuid, topic_row ->> 'role', topic_row ->> 'reason', nullif(topic_row ->> 'confidence', '')::numeric)
    on conflict (lecture_id, topic_id, role) do update set reason = excluded.reason, confidence = excluded.confidence;
  end loop;

  for question_row in select * from jsonb_array_elements(coalesce(payload -> 'questions', '[]'::jsonb)) loop
    insert into public.questions (lecture_id, question_text, explanation, position)
    values (lecture_uuid, question_row ->> 'question', question_row ->> 'explanation', (question_row ->> 'position')::integer)
    returning id into question_uuid;
    for option_row in select * from jsonb_array_elements(coalesce(question_row -> 'options', '[]'::jsonb)) loop
      insert into public.answer_options (question_id, option_text, is_correct, position)
      values (question_uuid, option_row ->> 'text', (option_row ->> 'correct')::boolean, (option_row ->> 'position')::integer);
    end loop;
  end loop;

  if jsonb_array_length(coalesce(payload -> 'answers', '[]'::jsonb)) > 0 then
    insert into public.quiz_attempts (user_id, lecture_id, score, total_questions, completed_at)
    values (owner_id, lecture_uuid, coalesce((payload #>> '{quiz_attempt,score}')::integer, 0), coalesce((payload #>> '{quiz_attempt,total}')::integer, 0), now())
    returning id into attempt_uuid;
    for answer_row in select * from jsonb_array_elements(payload -> 'answers') loop
      select q.id into question_uuid from public.questions q
      where q.lecture_id = lecture_uuid and q.position = (answer_row ->> 'question_position')::integer;
      select o.id into option_uuid from public.answer_options o
      where o.question_id = question_uuid and o.position = (answer_row ->> 'option_position')::integer;
      if question_uuid is not null and option_uuid is not null then
        insert into public.attempt_answers (attempt_id, question_id, selected_option_id, is_correct)
        values (attempt_uuid, question_uuid, option_uuid, (answer_row ->> 'correct')::boolean);
      end if;
    end loop;
  end if;

  for task_row in select * from jsonb_array_elements(coalesce(payload -> 'tasks', '[]'::jsonb)) loop
    insert into public.tasks (lecture_id, title, description, task_type, due_at, is_completed)
    values (
      lecture_uuid, task_row ->> 'title', task_row ->> 'description', task_row ->> 'type',
      nullif(task_row ->> 'due_at', '')::timestamptz, coalesce((task_row ->> 'completed')::boolean, false)
    ) returning id into task_uuid;
    for reminder_row in select * from jsonb_array_elements(coalesce(task_row -> 'reminders', '[]'::jsonb)) loop
      insert into public.reminders (task_id, remind_at, channel, status)
      values (task_uuid, (reminder_row ->> 'remind_at')::timestamptz, reminder_row ->> 'channel', reminder_row ->> 'status');
    end loop;
  end loop;

  return lecture_uuid;
end;
$$;

create or replace function public.save_lecture_graph(payload jsonb)
returns uuid language sql security invoker set search_path = '' as $$
  select private.save_lecture_graph(payload);
$$;

create or replace function public.list_lecture_history()
returns table (
  id uuid, title text, source_name text, language text, created_at timestamptz,
  current_topics text[], future_topics text[], score integer, total_questions integer,
  completed_tasks bigint, total_tasks bigint
) language sql security invoker set search_path = '' stable as $$
  select l.id, l.title, l.source_name, l.language, l.lecture_date::timestamptz,
    coalesce(array_agg(distinct t.name) filter (where lt.role = 'current'), '{}'),
    coalesce(array_agg(distinct t.name) filter (where lt.role = 'future'), '{}'),
    coalesce((select qa.score from public.quiz_attempts qa where qa.lecture_id = l.id and qa.user_id = (select auth.uid()) order by qa.completed_at desc limit 1), 0),
    coalesce((select qa.total_questions from public.quiz_attempts qa where qa.lecture_id = l.id and qa.user_id = (select auth.uid()) order by qa.completed_at desc limit 1), 0),
    (select count(*) from public.tasks tk where tk.lecture_id = l.id and tk.is_completed),
    (select count(*) from public.tasks tk where tk.lecture_id = l.id)
  from public.lectures l
  left join public.lecture_topics lt on lt.lecture_id = l.id
  left join public.topics t on t.id = lt.topic_id
  where l.user_id = (select auth.uid())
  group by l.id
  order by l.created_at desc;
$$;

create or replace function public.get_lecture_graph(p_lecture_id uuid)
returns jsonb language sql security invoker set search_path = '' stable as $$
  select jsonb_build_object(
    'id', l.id, 'createdAt', l.created_at, 'filename', l.source_name, 'text', tr.content,
    'settings', jsonb_build_object('date', to_char(l.lecture_date, 'YYYY-MM-DD'), 'language', l.language, 'syllabus', ''),
    'result', jsonb_build_object(
      'title', l.title,
      'analysis', jsonb_build_object(
        'overview', an.summary,
        'concepts', an.key_points,
        'explanations', coalesce(an.explanation_sections -> 'explanations', '[]'::jsonb),
        'examples', coalesce(an.explanation_sections -> 'examples', '[]'::jsonb),
        'connections', coalesce(an.explanation_sections -> 'connections', '[]'::jsonb),
        'review', an.recommended_actions
      ),
      'futureBasis', 'These are AI study suggestions based on the saved lecture.',
      'futureTopics', coalesce((select jsonb_agg(jsonb_build_object('title', t.name, 'reason', lt.reason, 'buildsOn', '[]'::jsonb, 'basis', 'ai_recommendation', 'confidence', case when lt.confidence >= .8 then 'high' when lt.confidence >= .5 then 'medium' else 'exploratory' end) order by t.name) from public.lecture_topics lt join public.topics t on t.id = lt.topic_id where lt.lecture_id = l.id and lt.role = 'future'), '[]'::jsonb),
      'teacherAssignments', coalesce((select jsonb_agg(jsonb_build_object('id', tk.id, 'title', tk.title, 'quote', tk.description, 'date', coalesce(to_char(tk.due_at at time zone 'UTC', 'YYYY-MM-DD'), ''), 'time', coalesce(to_char(tk.due_at at time zone 'UTC', 'HH24:MI'), ''), 'on', true) order by tk.created_at) from public.tasks tk where tk.lecture_id = l.id and tk.task_type = 'teacher'), '[]'::jsonb),
      'practiceTasks', coalesce((select jsonb_agg(jsonb_build_object('title', tk.title, 'reason', tk.description) order by tk.created_at) from public.tasks tk where tk.lecture_id = l.id and tk.task_type = 'ai_practice'), '[]'::jsonb),
      'quiz', coalesce((select jsonb_agg(jsonb_build_object('question', q.question_text, 'explanation', q.explanation, 'reviewTopic', 'Review the related concept in the analysis.', 'options', (select jsonb_agg(o.option_text order by o.position) from public.answer_options o where o.question_id = q.id), 'answer', (select o.position from public.answer_options o where o.question_id = q.id and o.is_correct limit 1)) order by q.position) from public.questions q where q.lecture_id = l.id), '[]'::jsonb)
    ),
    'answers', coalesce((select jsonb_object_agg(q.position::text, o.position) from public.quiz_attempts qa join public.attempt_answers aa on aa.attempt_id = qa.id join public.questions q on q.id = aa.question_id join public.answer_options o on o.id = aa.selected_option_id where qa.lecture_id = l.id and qa.user_id = (select auth.uid())), '{}'::jsonb),
    'checked', coalesce((select jsonb_object_agg(('practice-' || numbered.position)::text, numbered.is_completed) from (select tk.is_completed, row_number() over (order by tk.created_at) - 1 as position from public.tasks tk where tk.lecture_id = l.id and tk.task_type = 'ai_practice') numbered), '{}'::jsonb),
    'saveLocal', true,
    'cloudId', l.id
  )
  from public.lectures l
  join public.transcripts tr on tr.lecture_id = l.id
  join public.analyses an on an.lecture_id = l.id
  where l.id = p_lecture_id and l.user_id = (select auth.uid());
$$;

create or replace function public.database_demo_status()
returns table (connected boolean, table_count integer, checked_at timestamptz)
language sql security invoker set search_path = '' stable as $$
  select true, 12, now();
$$;

revoke all on all tables in schema public from anon, authenticated;
grant select on table public.profiles, public.lectures, public.transcripts, public.analyses, public.topics, public.lecture_topics, public.questions, public.answer_options, public.quiz_attempts, public.attempt_answers, public.tasks, public.reminders to authenticated;
grant update on table public.profiles to authenticated;
grant delete on table public.lectures to authenticated;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function private.save_lecture_graph(jsonb) from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.save_lecture_graph(jsonb) from public, anon;
revoke all on function public.list_lecture_history() from public, anon;
revoke all on function public.get_lecture_graph(uuid) from public, anon;
revoke all on function public.database_demo_status() from public;
grant execute on function private.save_lecture_graph(jsonb) to authenticated;
grant execute on function public.save_lecture_graph(jsonb) to authenticated;
grant execute on function public.list_lecture_history() to authenticated;
grant execute on function public.get_lecture_graph(uuid) to authenticated;
grant execute on function public.database_demo_status() to anon, authenticated;


