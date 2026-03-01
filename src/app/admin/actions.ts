"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getIsAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { TestType, TheoryBlockType } from "@/lib/supabase";

/** Storage bucket for quiz theory images (public read, admin write) */
const THEORY_IMAGES_BUCKET = "Eanglish";

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
  title: string;
  description: string;
  slug: string;
  pages: {
    type: TestType;
    title?: string | null;
    order_index: number;
    questions: {
      question_title: string;
      explanation?: string | null;
      order_index: number;
      options: { option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  theoryBlocks?: Omit<TheoryBlockInput, "id">[];
};

export async function createQuiz(data: CreateQuizInput) {
  const supabase = await createServerClient();

  let slug = data.slug.trim();
  let quiz: { id: string } | null = null;
  let quizError: { code?: string; message?: string } | null = null;

  while (true) {
    const result = await supabase
      .from("quizzes")
      .insert({
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
          question_title: q.question_title,
          explanation: q.explanation || null,
          order_index: q.order_index,
        })
        .select("id")
        .single();

      if (questionError || !question) {
        return { ok: false, error: questionError?.message ?? "Failed to create question" };
      }

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
  return { ok: true };
}

export type UpdateQuizInput = {
  quizId: string;
  title: string;
  description: string;
  slug: string;
  pages: {
    id?: string;
    type: TestType;
    title?: string | null;
    order_index: number;
    questions: {
      id?: string;
      question_title: string;
      explanation?: string | null;
      order_index: number;
      options: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  theoryBlocks?: TheoryBlockInput[];
};

export async function updateQuiz(data: UpdateQuizInput) {
  const supabase = await createServerClient();

  const { error: quizError } = await supabase
    .from("quizzes")
    .update({
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
            question_title: q.question_title,
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
            question_title: q.question_title,
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
        const path = getStoragePathFromPublicUrl(block.content, THEORY_IMAGES_BUCKET);
        if (path) pathsToRemove.push(path);
      }
    }
    if (pathsToRemove.length > 0) {
      const { error: storageErr } = await supabase.storage.from(THEORY_IMAGES_BUCKET).remove(pathsToRemove);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
    const { error: del } = await supabase.from("theory_blocks").delete().in("id", toDelB.map((x) => x.id));
    if (del) return { ok: false, error: del.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/quiz/${data.quizId}`);
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
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
  const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : ".jpg";
  const path = `theory/${quizId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(THEORY_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(THEORY_IMAGES_BUCKET).getPublicUrl(path);
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
    const path = getStoragePathFromPublicUrl(block.content, THEORY_IMAGES_BUCKET);
    if (path) {
      const { error: storageErr } = await supabase.storage.from(THEORY_IMAGES_BUCKET).remove([path]);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
  }

  const { error: del } = await supabase.from("theory_blocks").delete().eq("id", blockId);
  if (del) return { ok: false, error: del.message };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/quiz/${block.quiz_id}`);
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
  if (quizId) revalidatePath(`/admin/quiz/${quizId}`);
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
  if (quizId) revalidatePath(`/admin/quiz/${quizId}`);
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
  if (quizId) revalidatePath(`/admin/quiz/${quizId}`);
  return { ok: true };
}
