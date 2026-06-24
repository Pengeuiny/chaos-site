import { createClient } from "@/lib/supabase/server";
import type { ProductionWithDetails, Person } from "@/lib/types";

/**
 * Fetch all season productions with their showtimes and cast.
 * Returns [] if Supabase isn't configured yet (so the site still renders).
 */
export async function getProductions(): Promise<ProductionWithDetails[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productions")
    .select("*, showtimes(*), cast_members(*)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getProductions:", error.message);
    return [];
  }
  return (data ?? []) as ProductionWithDetails[];
}

export async function getProductionBySlug(
  slug: string,
): Promise<ProductionWithDetails | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productions")
    .select("*, showtimes(*), cast_members(*)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("getProductionBySlug:", error.message);
    return null;
  }
  return data as ProductionWithDetails;
}

export async function getPeople(group?: string): Promise<Person[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await createClient();
  let query = supabase
    .from("people")
    .select("*")
    .order("sort_order", { ascending: true });
  if (group) query = query.eq("group_name", group);

  const { data, error } = await query;
  if (error) {
    console.error("getPeople:", error.message);
    return [];
  }
  return (data ?? []) as Person[];
}
