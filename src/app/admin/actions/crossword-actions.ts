"use server";

import { revalidatePath } from "next/cache";
import { getIsAdmin } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase/server";
import {
  revalidateCrosswordByQuizId,
  revalidateCrosswordBySlug,
  revalidateQuizBySlug,
  revalidateQuizzes,
  revalidateQuizzesByTopicSlugAndChapter,
} from "@/lib/supabase/queries";
import { generateCrossword, validateCrosswordLayout } from "@/lib/crossword";
import type { CrosswordWordInput } from "@/lib/crossword";
import type { SaveCrosswordQuizInput } from "./types";
import { revalidateAdminPathsForQuizId, revalidateAdminPathsForTopicId } from "./shared";

function isCrosswordChapter(chapterKey: string): boolean {
  return chapterKey.trim().toLowerCase() === "crossword";
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "crossword";
}

async function getTopicMeta(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  topicId: string
) {
  const { data, error } = await supabase
    .from("topics")
    .select("slug, chapter")
    .eq("id", topicId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function revalidateCrosswordCaches(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  input: { quizId: string; slug: string; topicId: string }
) {
  const topic = await getTopicMeta(supabase, input.topicId);
  revalidatePath("/");
  revalidatePath(`/quiz/${input.slug}`);
  revalidateQuizzes();
  revalidateQuizBySlug(input.slug);
  revalidateCrosswordBySlug(input.slug);
  revalidateCrosswordByQuizId(input.quizId);
  if (topic) {
    revalidateQuizzesByTopicSlugAndChapter(topic.slug, topic.chapter);
  }
  await revalidateAdminPathsForTopicId(supabase, input.topicId);
  await revalidateAdminPathsForQuizId(supabase, input.quizId);
}

export async function generateCrosswordAction(words: CrosswordWordInput[]) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false as const, error: "Unauthorized" };

  return generateCrossword(words);
}

export async function saveCrosswordQuiz(data: SaveCrosswordQuizInput) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false as const, error: "Unauthorized" };

  const supabase = await createServerClient();
  const topic = await getTopicMeta(supabase, data.topic_id);
  if (!topic) return { ok: false as const, error: "Topic not found" };
  if (!isCrosswordChapter(topic.chapter)) {
    return { ok: false as const, error: "Topic does not belong to crossword section" };
  }

  if (!data.title.trim()) return { ok: false as const, error: "Title is required" };

  const validation = validateCrosswordLayout(data.entries);
  if (!validation.ok) return { ok: false as const, error: validation.error };

  const baseSlug = slugify(data.slug || data.title);
  const maxAttempts = data.quizId ? 1 : 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: rpcData, error } = await supabase.rpc("save_crossword_quiz", {
      p_quiz_id: data.quizId ?? null,
      p_topic_id: data.topic_id,
      p_title: data.title.trim(),
      p_description: data.description.trim(),
      p_slug: slug,
      p_width: validation.layout.width,
      p_height: validation.layout.height,
      p_grid: validation.layout.grid,
      p_entries: validation.layout.entries,
    });

    if (error) {
      if (!data.quizId && error.code === "23505") continue;
      return { ok: false as const, error: error.message };
    }

    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    const quizId = result?.quiz_id as string | undefined;
    const quizSlug = result?.quiz_slug as string | undefined;
    if (!quizId || !quizSlug) {
      return { ok: false as const, error: "Failed to save crossword" };
    }

    await revalidateCrosswordCaches(supabase, {
      quizId,
      slug: quizSlug,
      topicId: data.topic_id,
    });
    return { ok: true as const, quizId, slug: quizSlug };
  }

  return { ok: false as const, error: "Failed to create a unique crossword slug" };
}
