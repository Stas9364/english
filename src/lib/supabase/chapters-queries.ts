import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache, updateTag } from "next/cache";
import type { AdminChapter } from "./types";

const CHAPTERS_TAG = "chapters";

/** Разделы админки из БД (без хардкода в UI) */
export async function getAdminChapters(
  supabase: SupabaseClient
): Promise<AdminChapter[]> {
  const getAdminChaptersCached = unstable_cache(
    async (): Promise<AdminChapter[]> => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, key, name, order_index")
        .order("order_index", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AdminChapter[];
    },
    ["chapters:admin-list"],
    { tags: [CHAPTERS_TAG] }
  );

  return getAdminChaptersCached();
}

/** Немедленный сброс тега (`updateTag` — только из Server Actions). */
export function revalidateAdminChapters() {
  updateTag(CHAPTERS_TAG);
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
