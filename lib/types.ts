// Row shapes mirroring supabase/schema.sql

export type Production = {
  id: string;
  slug: string;
  title: string;
  title_note: boolean;
  type: string | null;
  tag_text: string | null;
  tag_class: string | null;
  poster_url: string | null;
  accent: string | null;
  venue: string | null;
  address: string | null;
  tagline: string | null;
  synopsis: string | null;
  ticket_url: string | null;
  date_range: string | null;
  has_microsite: boolean;
  sort_order: number;
  created_at: string;
};

export type Showtime = {
  id: string;
  production_id: string;
  starts_at: string;
  label: string | null;
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
