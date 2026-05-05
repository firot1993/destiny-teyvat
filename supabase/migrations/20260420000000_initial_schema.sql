-- Initial schema for the LLM fine-tuning dataset.
-- One row per generation attempt in `sessions`; append-only `llm_calls` log
-- captures every provider request/response pair.

create extension if not exists "pgcrypto";

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_uuid text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'scanning',
  language text,
  provider text,
  model text,
  guidance integer,
  denoise_steps integer,
  big_five jsonb,
  questionnaire_answers jsonb,
  normalized_fields jsonb,
  story_conditioning jsonb,
  scan_fragments jsonb,
  curation_answers jsonb,
  author_voice text,
  final_story text,
  user_rating text,
  user_feedback text,
  rated_at timestamptz
);

create index if not exists sessions_session_uuid_idx on public.sessions (session_uuid);
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);
create index if not exists sessions_status_idx on public.sessions (status);

create table if not exists public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  phase text not null,
  step_index integer not null default 0,
  system_prompt text,
  user_prompt text,
  response_text text,
  provider text,
  model text,
  temperature real,
  max_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists llm_calls_session_id_idx on public.llm_calls (session_id);
create index if not exists llm_calls_phase_idx on public.llm_calls (phase);

-- Auto-bump sessions.updated_at on any row change.
create or replace function public.touch_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_touch_updated_at on public.sessions;
create trigger sessions_touch_updated_at
  before update on public.sessions
  for each row execute function public.touch_sessions_updated_at();
