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
