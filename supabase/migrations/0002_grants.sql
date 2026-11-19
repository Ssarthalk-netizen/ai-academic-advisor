-- =====================================================================
-- AI Academic Advisor - table privileges
-- Newer Supabase projects no longer auto-grant table access to the API
-- roles. Row Level Security (0001) still decides WHICH rows a user sees;
-- these grants only allow signed-in users to use the tables at all.
-- The anonymous role gets nothing. Safe to run more than once.
-- =====================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.profiles, public.semesters, public.subjects, public.assessments,
  public.assignments, public.exams, public.study_sessions, public.goals,
  public.skills, public.risk_snapshots, public.chat_messages,
  public.ai_recommendations, public.documents
to authenticated;

-- the server's service role (rate limiting, account deletion)
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- rate_limits is only reachable through hit_rate_limit(), never directly
revoke all on public.rate_limits from anon, authenticated;
revoke all on all tables in schema public from anon;

grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
