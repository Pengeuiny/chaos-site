// Row shapes mirroring supabase/schema.sql

export type Program = "theatre" | "choir";

export type Production = {
  id: string;
  slug: string;
  program: Program;
  title: string;
  title_note: boolean;
  type: string | null;
  poster_url: string | null;
  accent: string | null;
  venue: string | null;
  address: string | null;
  tagline: string | null;
  synopsis: string | null;
  ticket_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  dates_tbd: boolean;
  date_range: string | null;
  has_microsite: boolean;
  cast_is_sample: boolean;
  sort_order: number;
  created_at: string;
};

export type Showtime = {
  id: string;
  production_id: string;
  starts_at: string | null;
  starts_tbd: boolean;
  label: string | null;
  ticket_url: string | null;
  sort_order: number;
};

export type CastMember = {
  id: string;
  production_id: string;
  role: string;
  actor: string | null;
  is_lead: boolean;
  sort_order: number;
};

export type Person = {
  id: string;
  group_name: "board" | "its" | string;
  role: string;
  name: string;
  email: string | null;
  image_url: string | null;
  sort_order: number;
};

export type ProductionWithDetails = Production & {
  showtimes: Showtime[];
  cast_members: CastMember[];
};

// Budget management — see docs/theater-budget.md and supabase/schema.sql

export type OverheadAllocationMethod = "equal" | "percent_of_direct" | "participants";

export type BudgetSeason = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  overhead_allocation_method: OverheadAllocationMethod;
  contingency_default_percent: number;
  dual_signature_threshold: number;
  reserve_target_months: number;
  current_reserve_balance: number | null;
  created_at: string;
};

export type BudgetLineItemScope = "show" | "overhead" | "trip";

export type BudgetLineItem = {
  id: string;
  season_id: string;
  production_id: string | null;
  scope: BudgetLineItemScope;
  category: string;
  description: string | null;
  budgeted_amount: number;
  is_contingency: boolean;
  sort_order: number;
  created_at: string;
};

export type BudgetExpenseStatus = "committed" | "paid";

export type BudgetExpense = {
  id: string;
  line_item_id: string;
  amount: number;
  status: BudgetExpenseStatus;
  vendor: string | null;
  description: string | null;
  expense_date: string;
  approved_by: string | null;
  created_at: string;
};

export type BudgetRevenueSourceType =
  | "tickets"
  | "concessions"
  | "program_ads"
  | "merch"
  | "donations"
  | "sponsorships"
  | "grants"
  | "fundraisers"
  | "other";

export type BudgetRevenueLine = {
  id: string;
  season_id: string;
  production_id: string | null;
  source_type: BudgetRevenueSourceType;
  projected_amount: number;
  actual_amount: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

export type BudgetLineItemWithExpenses = BudgetLineItem & {
  budget_expenses: BudgetExpense[];
};
