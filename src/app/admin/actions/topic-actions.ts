"use server";

import type { Chapter } from "@/lib/chapters";
import { getIsAdmin } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractTopicChapterKey } from "./shared";

/** Lightweight topics list for topic select in quiz forms. */
export async function getTopicsForQuizForm(): Promise<
  { ok: true; data: { id: string; name: string }[] } | { ok: false; error: string }
> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id, name")
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as { id: string; name: string }[] };
}

function slugifyTopicName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Create topic with unique slug. */
export async function createTopic(payload: {
  chapter: Chapter;
  name: string;
  description?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const name = payload.name.trim();
  if (!name) return { ok: false, error: "Topic name is required" };
  const description = payload.description?.trim() ?? "";

  const supabase = await createServerClient();
  const { data: chapterRow, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("key", payload.chapter)
    .maybeSingle();

  if (chapterError || !chapterRow) {
    return { ok: false, error: chapterError?.message ?? "Section is not configured" };
  }

  const baseSlug = slugifyTopicName(name) || "topic";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { error } = await supabase.from("topics").insert({
      name,
      slug,
      description: description || null,
      chapter_id: chapterRow.id,
    });

    if (!error) break;
    if (error.code === "23505") {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
      continue;
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${payload.chapter}`);
  return { ok: true };
}

/** Update topic fields. */
export async function updateTopic(
  topicId: string,
  payload: { name: string; description?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const nextName = payload.name.trim();
  if (!nextName) return { ok: false, error: "Topic name is required" };
  const nextDescription = payload.description?.trim() ?? "";

  const supabase = await createServerClient();
  const { data: existing } = await supabase
    .from("topics")
    .select("slug, chapters:chapters!topics_chapter_id_fkey!inner(key)")
    .eq("id", topicId)
    .single();

  const { error } = await supabase
    .from("topics")
    .update({ name: nextName, description: nextDescription || null })
    .eq("id", topicId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  const existingChapter = extractTopicChapterKey(existing);
  if (existing && existingChapter) {
    revalidatePath(`/admin/${existingChapter}`);
    revalidatePath(`/admin/${existingChapter}/${existing.slug}`);
  }
  return { ok: true };
}

/** Delete topic (allowed only when there are no quizzes in it). */
export async function deleteTopic(
  topicId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: topic } = await supabase
    .from("topics")
    .select("slug, chapters:chapters!topics_chapter_id_fkey!inner(key)")
    .eq("id", topicId)
    .single();

  const { error } = await supabase.from("topics").delete().eq("id", topicId);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Topic has quizzes. Move or delete quizzes first.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  const topicChapter = extractTopicChapterKey(topic);
  if (topic && topicChapter) {
    revalidatePath(`/admin/${topicChapter}`);
    revalidatePath(`/admin/${topicChapter}/${topic.slug}`);
  }
  return { ok: true };
}
