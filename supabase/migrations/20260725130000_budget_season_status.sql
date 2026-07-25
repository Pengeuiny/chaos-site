-- Draft vs. approved budget seasons. Once approved, the numbers are the
-- season's committed target — edits are still allowed (same roles as
-- before) but the UI requires an explicit confirmation, and the season
-- can be rolled back to draft if the approval was premature.
alter table public.budget_seasons
  add column if not exists status text not null default 'draft' check (status in ('draft', 'approved')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;
