-- =====================================================================
-- AI Academic Advisor - database schema
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Security model: every table has Row Level Security (RLS) ON and a policy
-- that only lets a signed-in user touch rows where user_id = their own id.
-- Deleting a user from auth.users cascades and removes all their data.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text check (char_length(full_name) <= 100),
  university      text check (char_length(university) <= 150),
  degree          text check (char_length(degree) <= 100),
  branch          text check (char_length(branch) <= 100),
  current_semester smallint check (current_semester between 1 and 12),
  admission_score numeric(5,2) check (admission_score between 0 and 100),
  date_of_birth   date,
  scholarship_holder boolean not null default false,
  fees_up_to_date boolean not null default true,
  has_outstanding_dues boolean not null default false,
  living_away_from_home boolean not null default false,
  interests       text[] not null default '{}',
  learning_style  text check (learning_style in ('visual','reading','practice','video','mixed')),
  weekly_study_hours smallint check (weekly_study_hours between 0 and 100),
  attendance_threshold smallint not null default 75 check (attendance_threshold between 0 and 100),
  target_cgpa     numeric(4,2) check (target_cgpa between 0 and 10),
  career_goal     text check (char_length(career_goal) <= 100),
  onboarded       boolean not null default false,
  ai_consent      boolean not null default false,   -- consent to send academic data to Gemini
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -------------------------------------------------------------- semesters
create table if not exists public.semesters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number      smallint not null check (number between 1 and 12),
  label       text check (char_length(label) <= 50),
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, number)
);

-- --------------------------------------------------------------- subjects
create table if not exists public.subjects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  semester_id   uuid not null references public.semesters(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  code          text check (char_length(code) <= 30),
  credits       numeric(3,1) not null default 3 check (credits between 0 and 20),
  marks_obtained numeric(6,2) check (marks_obtained >= 0),   -- final total, null while in progress
  max_marks     numeric(6,2) not null default 100 check (max_marks > 0),
  classes_attended smallint not null default 0 check (classes_attended >= 0),
  classes_total smallint not null default 0 check (classes_total >= 0),
  difficulty    smallint check (difficulty between 1 and 5),  -- self-rated
  created_at    timestamptz not null default now(),
  check (marks_obtained is null or marks_obtained <= max_marks),
  check (classes_attended <= classes_total)
);

-- ------------------------------------------- assessments (quiz, mid-term…)
create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  kind        text not null check (kind in ('quiz','assignment','midterm','practical','endterm','other')),
  title       text check (char_length(title) <= 120),
  topic       text check (char_length(topic) <= 120),
  score       numeric(6,2) not null check (score >= 0),
  max_score   numeric(6,2) not null check (max_score > 0),
  taken_on    date,
  created_at  timestamptz not null default now(),
  check (score <= max_score)
);

-- ------------------------------------------------- assignments / deadlines
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 150),
  description text check (char_length(description) <= 1000),
  due_at      timestamptz not null,
  status      text not null default 'pending' check (status in ('pending','in_progress','submitted','missed')),
  est_hours   numeric(4,1) check (est_hours between 0 and 100),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- exams
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 150),
  kind        text not null default 'endterm' check (kind in ('midterm','endterm','practical','quiz','other')),
  exam_date   date not null,
  syllabus_done smallint not null default 0 check (syllabus_done between 0 and 100),
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------- study plan sessions
create table if not exists public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete cascade,
  topic        text check (char_length(topic) <= 150),
  planned_date date not null,
  planned_minutes smallint not null check (planned_minutes between 10 and 600),
  actual_minutes  smallint check (actual_minutes between 0 and 900),
  status       text not null default 'planned' check (status in ('planned','done','missed','skipped')),
  understanding smallint check (understanding between 1 and 5),
  source       text not null default 'planner' check (source in ('planner','manual','recovery')),
  rescheduled_from uuid references public.study_sessions(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- -------------------------------------------------------------------- goals
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 150),
  kind        text not null default 'academic' check (kind in ('academic','skill','career')),
  target_date date,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- skills
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  level       smallint not null default 1 check (level between 1 and 5),
  evidence    text check (char_length(evidence) <= 300),   -- project / certificate link or note
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ----------------------------------------------- risk prediction history
create table if not exists public.risk_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  probability numeric(5,4) not null check (probability between 0 and 1),
  level       text not null check (level in ('Low','Medium','High')),
  model       text not null,
  factors     jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- AI chat
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null check (char_length(content) <= 8000),
  intent      text,
  confidence  numeric(5,4),
  escalated   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------- AI recommendations (+evidence)
create table if not exists public.ai_recommendations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('priority','study_plan','career','weekly_report','recovery')),
  content     jsonb not null,
  evidence    jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------ documents (syllabus etc.)
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  kind        text not null default 'notes' check (kind in ('syllabus','notes','question_paper','other')),
  title       text not null check (char_length(title) between 1 and 150),
  storage_path text not null,
  size_bytes  integer not null check (size_bytes between 1 and 10485760),
  summary     text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------- rate-limit counters
create table if not exists public.rate_limits (
  key          text not null,            -- e.g. 'chat:<user id>' or 'login:<ip>'
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

-- =============================================================== indexes
create index if not exists idx_subjects_user on public.subjects(user_id, semester_id);
create index if not exists idx_assess_subject on public.assessments(subject_id);
create index if not exists idx_assign_user_due on public.assignments(user_id, due_at);
create index if not exists idx_exams_user_date on public.exams(user_id, exam_date);
create index if not exists idx_sessions_user_date on public.study_sessions(user_id, planned_date);
create index if not exists idx_chat_user_time on public.chat_messages(user_id, created_at);
create index if not exists idx_risk_user_time on public.risk_snapshots(user_id, created_at);

-- ====================================================== row level security
do $$
declare t text;
begin
  foreach t in array array['semesters','subjects','assessments','assignments','exams',
                           'study_sessions','goals','skills','risk_snapshots','chat_messages',
                           'ai_recommendations','documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format($p$create policy "own rows" on public.%I for all to authenticated
                    using ((select auth.uid()) = user_id)
                    with check ((select auth.uid()) = user_id)$p$, t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- rate_limits: no policies -> only reachable through the function below
alter table public.rate_limits enable row level security;

-- Child rows must belong to the same user as their parent
create or replace function public.enforce_same_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'subjects' then
    if not exists (select 1 from semesters s where s.id = new.semester_id and s.user_id = new.user_id) then
      raise exception 'semester does not belong to user';
    end if;
  else
    if new.subject_id is not null and not exists
       (select 1 from subjects s where s.id = new.subject_id and s.user_id = new.user_id) then
      raise exception 'subject does not belong to user';
    end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['subjects','assessments','assignments','exams','study_sessions','documents']
  loop
    execute format('drop trigger if exists trg_same_owner on public.%I', t);
    execute format('create trigger trg_same_owner before insert or update on public.%I
                    for each row execute function public.enforce_same_owner()', t);
  end loop;
end $$;

-- Auto-create a profile row when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep profiles.updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Fixed-window rate limiter. Returns true if the call is allowed.
-- Only the server (service role) may call it.
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into rate_limits(key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into c;
  delete from rate_limits where window_start < now() - interval '1 day';
  return c <= p_max;
end $$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- =========================================================== file storage
-- Private bucket, PDFs only, 10 MB max. Files live under <user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "own documents read" on storage.objects;
drop policy if exists "own documents write" on storage.objects;
drop policy if exists "own documents delete" on storage.objects;
create policy "own documents read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own documents write" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
