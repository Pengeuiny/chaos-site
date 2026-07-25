-- Reusable, global category list for budget line items — replaces free-text
-- category entry so the same name (e.g. "Royalties") is spelled the same
-- way across every show and season instead of drifting per typist.
create table if not exists public.budget_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create unique index if not exists budget_categories_name_lower_idx on public.budget_categories (lower(name));

alter table public.budget_line_items
  add column if not exists category_id uuid references public.budget_categories(id) on delete set null;

alter table public.budget_categories enable row level security;
