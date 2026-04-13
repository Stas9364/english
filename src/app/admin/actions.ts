"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { getIsAdmin } from "@/lib/supabase";
import { isChapter, type Chapter } from "@/lib/chapters";
import { revalidatePath } from "next/cache";
import type { TestType, TheoryBlockType } from "@/lib/supabase";

/** Списки тем и квизов в админке для данного топика */
async function revalidateAdminPathsForTopicId(
  supabase: SupabaseClient,
  topicId: string | null | undefined
) {
  if (!topicId) return;
  const { data: t } = await supabase
    .from("topics")
    .select("slug, chapter")
    .eq("id", topicId)
    .single();
  if (!t || !isChapter(t.chapter)) return;
  revalidatePath(`/admin/${t.chapter}`);
  revalidatePath(`/admin/${t.chapter}/${t.slug}`);
}

async function revalidateAdminPathsForQuizId(supabase: SupabaseClient, quizId: string) {
  const { data: quiz } = await supabase.from("quizzes").select("topic_id").eq("id", quizId).single();
  await revalidateAdminPathsForTopicId(supabase, quiz?.topic_id);
}

/** Storage bucket for quiz theory images (public read, admin write) */
const IMAGES_BUCKET = "Eanglish";

/** Extract Storage file path from a public URL (e.g. .../object/public/BUCKET/path). Returns null if not our bucket URL. */
function getStoragePathFromPublicUrl(url: string, bucket: string): string | null {
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

export type TheoryBlockInput = {
  id?: string;
  type: TheoryBlockType;
  content: string;
  order_index: number;
};

export type CreateQuizInput = {
  /** Раздел страницы создания — должен совпадать с `topics.chapter` выбранной темы */
  chapter: Chapter;
  topic_id: string;
  title: string;
  description: string;
  slug: string;
  pages: {
    type: TestType;
    title?: string | null;
    example?: string | null;
    order_index: number;
    questions: {
      question_title: string;
      question_image_url?: string | null;
      explanation?: string | null;
      order_index: number;
      options: { option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  theoryBlocks?: Omit<TheoryBlockInput, "id">[];
};

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

  if (!isChapter(payload.chapter)) return { ok: false, error: "Invalid section" };

  const name = payload.name.trim();
  if (!name) return { ok: false, error: "Topic name is required" };
  const description = payload.description?.trim() ?? "";

  const supabase = await createServerClient();
  const baseSlug = slugifyTopicName(name) || "topic";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { error } = await supabase.from("topics").insert({
      name,
      slug,
      description: description || null,
      chapter: payload.chapter,
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

export async function createQuiz(data: CreateQuizInput) {
  const supabase = await createServerClient();

  if (!isChapter(data.chapter)) {
    return { ok: false, error: "Invalid section" };
  }

  const { data: topicRow, error: topicFetchError } = await supabase
    .from("topics")
    .select("chapter")
    .eq("id", data.topic_id)
    .single();

  if (topicFetchError || !topicRow || topicRow.chapter !== data.chapter) {
    return { ok: false, error: "Topic does not belong to this section" };
  }

  let slug = data.slug.trim();
  let quiz: { id: string } | null = null;
  let quizError: { code?: string; message?: string } | null = null;

  while (true) {
    const result = await supabase
      .from("quizzes")
      .insert({
        topic_id: data.topic_id,
        title: data.title,
        description: data.description || null,
        slug,
      })
      .select("id")
      .single();

    quizError = result.error;
    quiz = result.data;

    if (!quizError) break;
    if (quizError.code === "23505") {
      slug = `${slug}-2`;
      continue;
    }
    return { ok: false, error: quizError?.message ?? "Failed to create quiz" };
  }

  if (!quiz) {
    return { ok: false, error: "Failed to create quiz" };
  }

  for (let pi = 0; pi < data.pages.length; pi++) {
    const page = data.pages[pi];
    const { data: quizPage, error: pageError } = await supabase
      .from("quiz_pages")
      .insert({
        quiz_id: quiz.id,
        type: page.type,
        title: page.title || null,
        example: page.example || null,
        order_index: page.order_index,
      })
      .select("id")
      .single();

    if (pageError || !quizPage) {
      return { ok: false, error: pageError?.message ?? "Failed to create page" };
    }

    for (let qi = 0; qi < page.questions.length; qi++) {
      const q = page.questions[qi];
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({
          page_id: quizPage.id,
          question_title: q.question_title || "",
          question_image_url: q.question_image_url || null,
          explanation: q.explanation || null,
          order_index: q.order_index,
        })
        .select("id")
        .single();

      if (questionError || !question) {
        return { ok: false, error: questionError?.message ?? "Failed to create question" };
      }

      // single, multiple, matching: require at least one option per question
      if (page.type !== "input" && page.type !== "select_gaps" && q.options.length === 0) {
        return { ok: false, error: "Choice page must have at least one option per question" };
      }
      const optionsToInsert =
        page.type === "input"
          ? q.options.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ question_id: question.id, option_text: o.option_text.trim(), is_correct: true, gap_index: o.gap_index ?? 0 }))
          : page.type === "select_gaps"
            ? q.options.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ question_id: question.id, option_text: o.option_text.trim(), is_correct: o.is_correct, gap_index: o.gap_index ?? 0 }))
            : q.options.map((o) => ({ question_id: question.id, option_text: o.option_text, is_correct: o.is_correct }));
      if (optionsToInsert.length > 0) {
        const { error: optionsError } = await supabase.from("options").insert(optionsToInsert);
        if (optionsError) return { ok: false, error: optionsError.message };
      }
    }
  }

  if (data.theoryBlocks?.length) {
    for (let i = 0; i < data.theoryBlocks.length; i++) {
      const b = data.theoryBlocks[i];
      const { error: tbError } = await supabase.from("theory_blocks").insert({
        quiz_id: quiz.id,
        type: b.type,
        content: b.content.trim() || " ",
        order_index: b.order_index,
      });
      if (tbError) return { ok: false, error: tbError.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/${data.chapter}`);
  await revalidateAdminPathsForTopicId(supabase, data.topic_id);
  return { ok: true };
}

export type UpdateQuizInput = {
  quizId: string;
  topic_id: string;
  title: string;
  description: string;
  slug: string;
  pages: {
    id?: string;
    type: TestType;
    title?: string | null;
    example?: string | null;
    order_index: number;
    questions: {
      id?: string;
      question_title: string;
      question_image_url?: string | null;
      explanation?: string | null;
      order_index: number;
      options: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  theoryBlocks?: TheoryBlockInput[];
};

export async function updateQuiz(data: UpdateQuizInput) {
  const supabase = await createServerClient();

  const { data: beforeQuiz } = await supabase
    .from("quizzes")
    .select("topic_id")
    .eq("id", data.quizId)
    .single();

  const { error: quizError } = await supabase
    .from("quizzes")
    .update({
      topic_id: data.topic_id,
      title: data.title,
      description: data.description || null,
      slug: data.slug.trim(),
    })
    .eq("id", data.quizId);

  if (quizError) return { ok: false, error: quizError.message };

  const { data: existingPages } = await supabase
    .from("quiz_pages")
    .select("id")
    .eq("quiz_id", data.quizId);
  const existingPageIds = new Set((existingPages ?? []).map((p) => p.id));
  const keptPageIds: string[] = [];

  for (const page of data.pages) {
    let pageId: string;

    if (page.id && existingPageIds.has(page.id)) {
      pageId = page.id;
      const { error: up } = await supabase
        .from("quiz_pages")
        .update({
          type: page.type,
          title: page.title || null,
          example: page.example || null,
          order_index: page.order_index,
        })
        .eq("id", pageId);
      if (up) return { ok: false, error: up.message };
    } else {
      const { data: inserted, error: ins } = await supabase
        .from("quiz_pages")
        .insert({
          quiz_id: data.quizId,
          type: page.type,
          title: page.title || null,
          example: page.example || null,
          order_index: page.order_index,
        })
        .select("id")
        .single();
      if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert page" };
      pageId = inserted.id;
    }
    keptPageIds.push(pageId);

    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("id")
      .eq("page_id", pageId);
    const existingQuestionIds = new Set((existingQuestions ?? []).map((q) => q.id));
    const keptQuestionIds: string[] = [];

    for (const q of page.questions) {
      let questionId: string;

      if (q.id && existingQuestionIds.has(q.id)) {
        questionId = q.id;
        const { error: up } = await supabase
          .from("questions")
          .update({
            question_title: q.question_title || "",
            question_image_url: q.question_image_url || null,
            explanation: q.explanation || null,
            order_index: q.order_index,
          })
          .eq("id", questionId);
        if (up) return { ok: false, error: up.message };
      } else {
        const { data: inserted, error: ins } = await supabase
          .from("questions")
          .insert({
            page_id: pageId,
            question_title: q.question_title || "",
            question_image_url: q.question_image_url || null,
            explanation: q.explanation || null,
            order_index: q.order_index,
          })
          .select("id")
          .single();
        if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert question" };
        questionId = inserted.id;
      }
      keptQuestionIds.push(questionId);

      const { data: existingOpts } = await supabase
        .from("options")
        .select("id")
        .eq("question_id", questionId);
      const existingOptIds = new Set((existingOpts ?? []).map((o) => o.id));

      const isInput = page.type === "input";
      const isSelectGaps = page.type === "select_gaps";
      const isGapBased = isInput || isSelectGaps;
      // matching: same as single/multiple — options with is_correct, no gap_index
      const optionsToSync = isInput
        ? q.options.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: true as boolean, gap_index: o.gap_index ?? 0 }))
        : isSelectGaps
          ? q.options.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: o.is_correct, gap_index: o.gap_index ?? 0 }))
          : q.options;

      if (!isGapBased && optionsToSync.length === 0) {
        return { ok: false, error: "Choice page must have at least one option per question" };
      }

      const keptOptIds: string[] = [];
      for (const o of optionsToSync) {
        if (o.id && existingOptIds.has(o.id)) {
          keptOptIds.push(o.id);
          const { error: up } = await supabase
            .from("options")
            .update({
              option_text: o.option_text,
              is_correct: isInput ? true : o.is_correct,
              ...(isGapBased ? { gap_index: "gap_index" in o ? (o.gap_index ?? 0) : 0 } : {}),
            })
            .eq("id", o.id);
          if (up) return { ok: false, error: up.message };
        } else {
          const { data: inserted, error: ins } = await supabase
            .from("options")
            .insert({
              question_id: questionId,
              option_text: o.option_text,
              is_correct: isInput ? true : o.is_correct,
              ...(isGapBased ? { gap_index: "gap_index" in o ? (o.gap_index ?? 0) : 0 } : {}),
            })
            .select("id")
            .single();
          if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert option" };
          keptOptIds.push(inserted.id);
        }
      }
      const toDel = (existingOpts ?? []).filter((x) => !keptOptIds.includes(x.id)).map((x) => x.id);
      if (toDel.length) {
        const { error: del } = await supabase.from("options").delete().in("id", toDel);
        if (del) return { ok: false, error: del.message };
      }
    }

    const toDelQ = (existingQuestions ?? []).filter((x) => !keptQuestionIds.includes(x.id)).map((x) => x.id);
    if (toDelQ.length) {
      const { error: del } = await supabase.from("questions").delete().in("id", toDelQ);
      if (del) return { ok: false, error: del.message };
    }
  }

  const toDelP = (existingPages ?? []).filter((x) => !keptPageIds.includes(x.id)).map((x) => x.id);
  if (toDelP.length) {
    const { error: del } = await supabase.from("quiz_pages").delete().in("id", toDelP);
    if (del) return { ok: false, error: del.message };
  }

  const theoryBlocks = data.theoryBlocks ?? [];
  const { data: existingBlocks } = await supabase
    .from("theory_blocks")
    .select("id, type, content")
    .eq("quiz_id", data.quizId);
  const existingBlockIds = new Set((existingBlocks ?? []).map((b) => b.id));
  const keptBlockIds: string[] = [];

  for (const b of theoryBlocks) {
    const content = (b.content ?? "").trim() || " ";
    if (b.id && existingBlockIds.has(b.id)) {
      keptBlockIds.push(b.id);
      const { error: up } = await supabase
        .from("theory_blocks")
        .update({ type: b.type, content, order_index: b.order_index })
        .eq("id", b.id);
      if (up) return { ok: false, error: up.message };
    } else {
      const { data: inserted, error: ins } = await supabase
        .from("theory_blocks")
        .insert({
          quiz_id: data.quizId,
          type: b.type,
          content,
          order_index: b.order_index,
        })
        .select("id")
        .single();
      if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert theory block" };
      keptBlockIds.push(inserted.id);
    }
  }

  const toDelB = (existingBlocks ?? []).filter((x) => !keptBlockIds.includes(x.id));
  if (toDelB.length) {
    const pathsToRemove: string[] = [];
    for (const row of toDelB) {
      const block = row as { id: string; type: string; content: string | null };
      if (block.type === "image" && block.content) {
        const path = getStoragePathFromPublicUrl(block.content, IMAGES_BUCKET);
        if (path) pathsToRemove.push(path);
      }
    }
    if (pathsToRemove.length > 0) {
      const { error: storageErr } = await supabase.storage.from(IMAGES_BUCKET).remove(pathsToRemove);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
    const { error: del } = await supabase.from("theory_blocks").delete().in("id", toDelB.map((x) => x.id));
    if (del) return { ok: false, error: del.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/quiz/${data.quizId}`);
  await revalidateAdminPathsForTopicId(supabase, beforeQuiz?.topic_id);
  await revalidateAdminPathsForTopicId(supabase, data.topic_id);
  return { ok: true };
}

/**
 * Upload an image to Storage and return its public URL for use in theory_blocks.
 * FormData must contain: file (File). Optional: quizId (string) for path grouping.
 */
export async function uploadTheoryImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0)
    return { ok: false, error: "No file provided" };

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type))
    return { ok: false, error: "Allowed types: JPEG, PNG, GIF, WebP" };

  const supabase = await createServerClient();
  const quizId = (formData.get("quizId") as string)?.trim() || "draft";
  const folder = (formData.get("folder") as string | null)?.trim() || "theory";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
  const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : ".jpg";
  const path = `${folder}/${quizId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return { ok: true, url: publicUrl };
}

/** Delete one theory block (and its Storage file if image). Immediate delete. */
export async function deleteTheoryBlock(
  blockId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: block, error: fetchErr } = await supabase
    .from("theory_blocks")
    .select("id, quiz_id, type, content")
    .eq("id", blockId)
    .single();

  if (fetchErr || !block) return { ok: false, error: fetchErr?.message ?? "Block not found" };

  if (block.type === "image" && block.content) {
    const path = getStoragePathFromPublicUrl(block.content, IMAGES_BUCKET);
    if (path) {
      const { error: storageErr } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
  }

  const { error: del } = await supabase.from("theory_blocks").delete().eq("id", blockId);
  if (del) return { ok: false, error: del.message };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/quiz/${block.quiz_id}`);
  await revalidateAdminPathsForQuizId(supabase, block.quiz_id);
  return { ok: true };
}

/** Delete a quiz (cascade deletes pages, questions, options, theory blocks). Immediate delete. */
export async function deleteQuiz(
  quizId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: quizRow } = await supabase.from("quizzes").select("topic_id").eq("id", quizId).single();

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  await revalidateAdminPathsForTopicId(supabase, quizRow?.topic_id);
  return { ok: true };
}

/** Delete a quiz page (cascade deletes questions and options). Immediate delete. */
export async function deleteQuizPage(
  pageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: page } = await supabase.from("quiz_pages").select("quiz_id").eq("id", pageId).single();
  const quizId = page?.quiz_id;

  const { error } = await supabase.from("quiz_pages").delete().eq("id", pageId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  if (quizId) {
    revalidatePath(`/admin/quiz/${quizId}`);
    await revalidateAdminPathsForQuizId(supabase, quizId);
  }
  return { ok: true };
}

/** Delete a question (cascade deletes options). Immediate delete. */
export async function deleteQuestion(
  questionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: q } = await supabase.from("questions").select("page_id").eq("id", questionId).single();
  let quizId: string | null = null;
  if (q?.page_id) {
    const { data: p } = await supabase.from("quiz_pages").select("quiz_id").eq("id", q.page_id).single();
    quizId = p?.quiz_id ?? null;
  }

  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  if (quizId) {
    revalidatePath(`/admin/quiz/${quizId}`);
    await revalidateAdminPathsForQuizId(supabase, quizId);
  }
  return { ok: true };
}

/** Remove only question image (db field + storage file). Immediate update. */
export async function deleteQuestionImage(
  questionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select("id, page_id, question_image_url")
    .eq("id", questionId)
    .single();

  if (qErr || !q) return { ok: false, error: qErr?.message ?? "Question not found" };

  let quizId: string | null = null;
  if (q.page_id) {
    const { data: p } = await supabase.from("quiz_pages").select("quiz_id").eq("id", q.page_id).single();
    quizId = p?.quiz_id ?? null;
  }

  if (q.question_image_url) {
    const path = getStoragePathFromPublicUrl(q.question_image_url, IMAGES_BUCKET);
    if (path) {
      const { error: storageErr } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
  }

  const { error: upErr } = await supabase
    .from("questions")
    .update({ question_image_url: null })
    .eq("id", questionId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/");
  revalidatePath("/admin");
  if (quizId) {
    revalidatePath(`/admin/quiz/${quizId}`);
    await revalidateAdminPathsForQuizId(supabase, quizId);
  }
  return { ok: true };
}

/** Delete one option. Immediate delete. */
export async function deleteOption(
  optionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: opt } = await supabase.from("options").select("question_id").eq("id", optionId).single();
  let quizId: string | null = null;
  if (opt?.question_id) {
    const { data: q } = await supabase.from("questions").select("page_id").eq("id", opt.question_id).single();
    if (q?.page_id) {
      const { data: p } = await supabase.from("quiz_pages").select("quiz_id").eq("id", q.page_id).single();
      quizId = p?.quiz_id ?? null;
    }
  }

  const { error } = await supabase.from("options").delete().eq("id", optionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  if (quizId) {
    revalidatePath(`/admin/quiz/${quizId}`);
    await revalidateAdminPathsForQuizId(supabase, quizId);
  }
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
    .select("slug, chapter")
    .eq("id", topicId)
    .single();

  const { error } = await supabase
    .from("topics")
    .update({ name: nextName, description: nextDescription || null })
    .eq("id", topicId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  if (existing && isChapter(existing.chapter)) {
    revalidatePath(`/admin/${existing.chapter}`);
    revalidatePath(`/admin/${existing.chapter}/${existing.slug}`);
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
    .select("slug, chapter")
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
  if (topic && isChapter(topic.chapter)) {
    revalidatePath(`/admin/${topic.chapter}`);
    revalidatePath(`/admin/${topic.chapter}/${topic.slug}`);
  }
  return { ok: true };
}
