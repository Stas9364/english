import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function extractChapterKey(
  chapters: { key: string } | { key: string }[] | null | undefined
): string | null {
  if (!chapters) return null;
  if (Array.isArray(chapters)) return chapters[0]?.key ?? null;
  return chapters.key ?? null;
}

/** Списки тем и квизов в админке для данного топика */
export async function revalidateAdminPathsForTopicId(
  supabase: SupabaseClient,
  topicId: string | null | undefined
) {
  if (!topicId) return;
  const { data: t } = await supabase
    .from("topics")
    .select("slug, chapters:chapters!topics_chapter_id_fkey!inner(key)")
    .eq("id", topicId)
    .single();
  const chapterKey = extractChapterKey(t?.chapters);
  if (!chapterKey) return;
  revalidatePath(`/admin/${chapterKey}`);
  revalidatePath(`/admin/${chapterKey}/${t?.slug}`);
}

export async function revalidateAdminPathsForQuizId(
  supabase: SupabaseClient,
  quizId: string
) {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("topic_id")
    .eq("id", quizId)
    .single();
  await revalidateAdminPathsForTopicId(supabase, quiz?.topic_id);
}

/** Storage bucket for quiz theory images (public read, admin write) */
export const IMAGES_BUCKET = "Eanglish";

/** Extract Storage file path from a public URL (e.g. .../object/public/BUCKET/path). Returns null if not our bucket URL. */
export function getStoragePathFromPublicUrl(
  url: string,
  bucket: string
): string | null {
  const prefix = `/storage/v1/object/public/${bucket}/`;
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    if (!pathname.includes(prefix)) return null;
    const after = pathname.split(prefix)[1];
    if (!after) return null;
    return decodeURIComponent(after);
  } catch {
    return null;
  }
}

export function extractTopicChapterKey(
  topic: { chapters?: { key: string } | { key: string }[] | null } | null | undefined
): string | null {
  return extractChapterKey(topic?.chapters);
}
