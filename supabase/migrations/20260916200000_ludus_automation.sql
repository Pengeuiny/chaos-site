-- Ludus automation. A public Google Sheet is synced into ludus_rows; a worker
-- running on a home machine (residential IP — Ludus sits behind Cloudflare's
-- bot check, which blocks datacenter browsers) polls the site, interprets each
-- new row with a local LLM into one or more proposed ludus_jobs, an admin
-- reviews/approves them on /admin/ludus, and the worker then creates the
-- objects in Ludus with Playwright and reports links + screenshots back.
-- Admin-only tables: no public policies, same posture as budget/audit tables.

create table if not exists public.ludus_settings (
  id                   int primary key default 1 check (id = 1),
  sheet_url            text,
  last_synced_at       timestamptz,
  last_sync_error      text,
  last_sync_rows       int,
  worker_last_seen_at  timestamptz,
  worker_status        text check (worker_status in ('ok', 'needs_attention')),
  worker_message       text,
  worker_version       text,
  updated_at           timestamptz not null default now()
);
insert into public.ludus_settings (id) values (1) on conflict (id) do nothing;

-- One row per distinct sheet row. Identity is a hash of the row's values, so
-- editing a row in the sheet produces a *new* ludus_rows record (and a fresh
-- proposal) while the old one is marked stale on the next sync.
create table if not exists public.ludus_rows (
  id             uuid primary key default gen_random_uuid(),
  row_number     int not null,
  row_hash       text not null unique,
  raw            jsonb not null,
  status         text not null default 'new'
                 check (status in ('new', 'interpreting', 'proposed', 'stale', 'error')),
  error          text,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now()
);
create index if not exists ludus_rows_status_idx on public.ludus_rows(status);

-- What the interpreter proposes for a row, what the admin decided, and what
-- the worker did. `spec` is the structured description the worker executes.
create table if not exists public.ludus_jobs (
  id            uuid primary key default gen_random_uuid(),
  row_id        uuid references public.ludus_rows(id) on delete cascade,
  kind          text not null check (kind in ('collection', 'event', 'skip')),
  spec          jsonb not null default '{}'::jsonb,
  notes         text,
  confidence    numeric,
  status        text not null default 'proposed'
                check (status in ('proposed', 'approved', 'rejected', 'running', 'done', 'failed')),
  attempts      int not null default 0,
  claimed_at    timestamptz,
  started_at    timestamptz,
  finished_at   timestamptz,
  result        jsonb,
  error         text,
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ludus_jobs_status_idx on public.ludus_jobs(status);
create index if not exists ludus_jobs_row_idx on public.ludus_jobs(row_id);

-- One screenshot per step the worker took, so an admin can see exactly what
-- was clicked without opening Ludus.
create table if not exists public.ludus_job_steps (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.ludus_jobs(id) on delete cascade,
  step_no          int not null,
  label            text not null,
  screenshot_path  text,
  created_at       timestamptz not null default now()
);
create index if not exists ludus_job_steps_job_idx on public.ludus_job_steps(job_id, step_no);

alter table public.ludus_settings  enable row level security;
alter table public.ludus_rows      enable row level security;
alter table public.ludus_jobs      enable row level security;
alter table public.ludus_job_steps enable row level security;

-- Screenshots are viewed from the admin page via public URLs (same approach
-- as poster images); the bucket holds nothing sensitive beyond Ludus admin
-- screens of the objects being created.
insert into storage.buckets (id, name, public)
values ('ludus-screenshots', 'ludus-screenshots', true)
on conflict (id) do nothing;

create policy "Public read ludus screenshots"
  on storage.objects for select
  using (bucket_id = 'ludus-screenshots');
