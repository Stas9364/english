import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminChapter } from "./types";

/** Разделы админки из БД (без хардкода в UI) */
export async function getAdminChapters(
  supabase: SupabaseClient
): Promise<AdminChapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, key, name, order_index")
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AdminChapter[];
}

/** Chapter by key for dynamic `/admin/[chapter]` routes. */
export async function getAdminChapterByKey(
  supabase: SupabaseClient,
  key: string
): Promise<AdminChapter | null> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, key, name, order_index")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminChapter;
}
