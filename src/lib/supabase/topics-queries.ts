import type { SupabaseClient } from "@supabase/supabase-js";
import type { Chapter } from "@/lib/chapters";
import type { Topic } from "./types";

export const TOPIC_SELECT =
  "id, name, slug, description, order_index, chapter, created_at";

/** Список тем для админки и фильтрации */
export async function getTopics(
  supabase: SupabaseClient
): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Topic[];
}

/** Тема по slug */
export async function getTopicBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Topic | null> {
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as Topic;
}

/** Темы одного раздела админки (для `/admin/[chapter]`) */
export async function getTopicsByChapter(
  supabase: SupabaseClient,
  chapter: Chapter
): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .eq("chapter", chapter)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Topic[];
}

/** Тема по slug и разделу (сегмент URL должен совпадать с `chapters.key`) */
export async function getTopicBySlugAndChapter(
  supabase: SupabaseClient,
  slug: string,
  chapter: Chapter
): Promise<Topic | null> {
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .eq("slug", slug)
    .eq("chapter", chapter)
    .maybeSingle();

  if (error || !data) return null;
  return data as Topic;
}

/** Минимальные данные темы по id (для ссылок и контекста навигации). */
export async function getTopicMetaById(
  supabase: SupabaseClient,
  topicId: string
): Promise<Pick<Topic, "slug" | "chapter"> | null> {
  const { data, error } = await supabase
    .from("topics")
    .select("slug, chapter")
    .eq("id", topicId)
    .single();

  if (error || !data) return null;
  return data as Pick<Topic, "slug" | "chapter">;
}
