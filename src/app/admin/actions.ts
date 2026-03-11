"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getIsAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { TestType, TheoryBlockType } from "@/lib/supabase";
import { z } from "zod";

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

/** Delete a quiz (cascade deletes pages, questions, options, theory blocks). Immediate delete. */
export async function deleteQuiz(
  quizId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
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

export type GenerateQuizPagesParams = {
  topic: string;
  level: string;
  language?: "RU" | "EN";
  pageCount: number;
  questionsPerPage: number;
  allowedTypes: TestType[];
  style?: string;
  constraints?: string;
  lexicon?: string;
  bannedTopics?: string;
};

type GeneratedOption = { option_text: string; is_correct: boolean; gap_index?: number };
type GeneratedQuestion = { question_title: string; explanation?: string | null; options?: GeneratedOption[] };
type GeneratedPage = { type: TestType; title?: string | null; questions: GeneratedQuestion[] };

const GeneratedDraftSchema = z.object({
  pages: z.array(
    z.object({
      type: z.enum(["single", "multiple", "input", "select_gaps", "matching"]),
      title: z.string().optional().nullable(),
      questions: z.array(
        z.object({
          question_title: z.string(),
          explanation: z.string().optional().nullable(),
          options: z
            .array(
              z.object({
                option_text: z.string(),
                is_correct: z.boolean(),
                gap_index: z.number().int().min(0).optional(),
              })
            )
            .optional(),
        })
      ),
    })
  ),
  theoryBlocks: z
    .array(
      z.object({
        type: z.enum(["text", "image"]),
        content: z.string(),
        order_index: z.number().int().min(0).optional(),
      })
    )
    .optional(),
});

function extractFirstJsonObject(text: string): string | null {
  const s = (text ?? "").trim();
  const firstBrace = s.indexOf("{");
  if (firstBrace === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(firstBrace, i + 1);
    }
  }
  return null;
}

function gapCountFromTitle(title: string): number {
  const count = Math.max(0, (title ?? "").split("[[]]").length - 1);
  return Math.max(1, count);
}

function normalizeGeneratedDraft(draft: z.infer<typeof GeneratedDraftSchema>): {
  pages: CreateQuizInput["pages"];
  theoryBlocks?: CreateQuizInput["theoryBlocks"];
} {
  const pages: CreateQuizInput["pages"] = [];

  for (let pi = 0; pi < draft.pages.length; pi++) {
    const p = draft.pages[pi] as GeneratedPage;
    const type = p.type;
    const pageTitle = (p.title ?? "")?.toString().trim();

    const questions: CreateQuizInput["pages"][number]["questions"] = [];
    const qs = Array.isArray(p.questions) ? p.questions : [];

    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi] as GeneratedQuestion;
      const question_title = (q.question_title ?? "").toString().trim();
      if (!question_title) continue;

      const explanation = (q.explanation ?? "")?.toString().trim();

      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const optionsTrimmed = rawOptions
        .map((o) => ({
          option_text: (o.option_text ?? "").toString().trim(),
          is_correct: !!o.is_correct,
          gap_index: Number.isFinite(o.gap_index as number) ? Math.max(0, Math.trunc(o.gap_index as number)) : undefined,
        }))
        .filter((o) => o.option_text.length > 0);

      const isInput = type === "input";
      const isSelectGaps = type === "select_gaps";
      const isGapBased = isInput || isSelectGaps;

      let normalizedOptions: { option_text: string; is_correct: boolean; gap_index?: number }[] = [];

      if (isGapBased) {
        const gaps = gapCountFromTitle(question_title);
        const byGap = new Map<number, { option_text: string; is_correct: boolean; gap_index?: number }[]>();
        for (let g = 0; g < gaps; g++) byGap.set(g, []);
        for (const o of optionsTrimmed) {
          const gi = o.gap_index ?? 0;
          if (!byGap.has(gi)) continue;
          byGap.get(gi)!.push({ option_text: o.option_text, is_correct: isInput ? true : o.is_correct, gap_index: gi });
        }
        for (let g = 0; g < gaps; g++) {
          const list = byGap.get(g) ?? [];
          if (list.length === 0) {
            throw new Error(
              type === "input"
                ? `Missing at least one correct answer for gap ${g + 1}`
                : `Missing at least one answer option for gap ${g + 1}`
            );
          }
          if (isSelectGaps && !list.some((x) => x.is_correct)) {
            throw new Error(`Mark at least one correct answer for gap ${g + 1}`);
          }
          normalizedOptions.push(...list);
        }
      } else {
        if (optionsTrimmed.length === 0) {
          throw new Error("Choice page must have at least one option per question");
        }
        normalizedOptions = optionsTrimmed.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct }));
      }

      questions.push({
        question_title,
        explanation: explanation || null,
        order_index: questions.length,
        options: normalizedOptions,
      });
    }

    if (questions.length === 0) continue;

    pages.push({
      type,
      title: pageTitle ? pageTitle : null,
      order_index: pages.length,
      questions,
    });
  }

  if (pages.length === 0) {
    throw new Error("Model returned no valid pages/questions");
  }

  const theoryBlocks = (draft.theoryBlocks ?? [])
    .map((b, i) => ({
      type: b.type as TheoryBlockType,
      content: (b.content ?? "").toString().trim() || " ",
      order_index: i,
    }))
    .filter((b) => !!b.content);

  return { pages, ...(theoryBlocks.length ? { theoryBlocks } : {}) };
}

function buildGeneratePrompt(params: GenerateQuizPagesParams): string {
  const allowed = params.allowedTypes.join(", ");
  const lang = params.language ?? "EN";
  const level = params.level.trim() || "B1";
  const style = (params.style ?? "").trim();
  const constraints = (params.constraints ?? "").trim();
  const lexicon = (params.lexicon ?? "").trim();
  const banned = (params.bannedTopics ?? "").trim();

  return [
    `You are generating quiz pages for an English-learning app.`,
    `Return ONLY valid JSON. No markdown. No extra text.`,
    ``,
    `Output schema:`,
    `{`,
    `  "pages": [`,
    `    {`,
    `      "type": "single" | "multiple" | "input" | "select_gaps" | "matching",`,
    `      "title": string | null,`,
    `      "questions": [`,
    `        {`,
    `          "question_title": string,`,
    `          "explanation": string | null,`,
    `          "options": [ { "option_text": string, "is_correct": boolean, "gap_index"?: number } ]`,
    `        }`,
    `      ]`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules:`,
    `- "type" must be one of: ${allowed}`,
    `- Create exactly ${params.pageCount} pages, each with exactly ${params.questionsPerPage} questions.`,
    `- question_title must be concise and must NOT contain HTML.`,
    `- For type "single": options length 3-5, exactly one is_correct=true.`,
    `- For type "multiple": options length 4-7, at least one is_correct=true.`,
    `- For type "matching": each question is one row (left column); options are the draggable answers (right column). Each question must have exactly one option with is_correct=true (its correct pair). Give each question enough CONTEXT so the learner can tell which answer fits: use a short sentence or phrase (e.g. "He ___ at the office" or "My sister ___ the guitar") rather than a single word. The context must make the correct match obvious. CRITICAL: avoid ambiguity — each correct answer must belong to exactly one question; ensure every question has a unique correct match so the task has a single correct solution. Keep options short.`,
    `- For type "input":`,
    `  - question_title must include one or more "[[]]" gaps; each gap is the place where the learner types the answer;`,
    `  - EACH gap must correspond to a VERB in INFINITIVE form shown in round brackets inside the sentence, e.g. "Next week the sports centre [[]] (close) for three days.";`,
    `  - options are accepted correct forms of that verb in context; set gap_index (0-based); is_correct must be true for all options.`,
    `- For type "select_gaps": question_title must include one or more "[[]]" gaps. options are choices; set gap_index (0-based). For each gap, provide 3-5 options and at least one is_correct=true.`,
    `- If there are N gaps in the title, you MUST provide at least one option for each gap_index from 0..N-1.`,
    ``,
    `Content requirements:`,
    `- Topic: ${params.topic}`,
    `- CEFR level: ${level}`,
    `- UI language for explanations: ${lang} (question_title and options stay in English unless the topic requires otherwise).`,
    style ? `- Style: ${style}` : null,
    constraints ? `- Constraints: ${constraints}` : null,
    lexicon ? `- Must include lexicon: ${lexicon}` : null,
    banned ? `- Avoid topics: ${banned}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateQuizPages(
  params: GenerateQuizPagesParams
): Promise<
  | { ok: true; pages: CreateQuizInput["pages"]; theoryBlocks?: CreateQuizInput["theoryBlocks"] }
  | { ok: false; error: string }
> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const MAX_PAGES = 20;
  const MAX_QUESTIONS_PER_PAGE = 20;
  const MAX_TOTAL_QUESTIONS = 200;
  const MAX_FIELD_LEN_TOPIC = 200;
  const MAX_FIELD_LEN_GENERIC = 2000;

  const trimOrUndef = (v: unknown): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
  };

  const ParamsSchema = z
    .object({
      topic: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s.length > 0, "Topic is required")
        .refine((s) => s.length <= MAX_FIELD_LEN_TOPIC, `Topic is too long (max ${MAX_FIELD_LEN_TOPIC})`),
      level: z.string().default("B1").transform((s) => (s ?? "").trim() || "B1"),
      language: z.enum(["RU", "EN"]).optional(),
      pageCount: z.number().int().min(1).max(MAX_PAGES),
      questionsPerPage: z.number().int().min(1).max(MAX_QUESTIONS_PER_PAGE),
      allowedTypes: z
        .array(z.enum(["single", "multiple", "input", "select_gaps", "matching"]))
        .min(1)
        .max(5),
      style: z.string().optional().transform(trimOrUndef).refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Style is too long (max ${MAX_FIELD_LEN_GENERIC})`),
      constraints: z
        .string()
        .optional()
        .transform(trimOrUndef)
        .refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Constraints is too long (max ${MAX_FIELD_LEN_GENERIC})`),
      lexicon: z.string().optional().transform(trimOrUndef).refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Lexicon is too long (max ${MAX_FIELD_LEN_GENERIC})`),
      bannedTopics: z
        .string()
        .optional()
        .transform(trimOrUndef)
        .refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Banned topics is too long (max ${MAX_FIELD_LEN_GENERIC})`),
    })
    .superRefine((p, ctx) => {
      const total = p.pageCount * p.questionsPerPage;
      if (total > MAX_TOTAL_QUESTIONS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Too many questions requested (${total}). Max is ${MAX_TOTAL_QUESTIONS}.`,
          path: ["questionsPerPage"],
        });
      }
    });

  let parsedParams: GenerateQuizPagesParams;
  try {
    parsedParams = {
      ...ParamsSchema.parse(params),
      // Страницы добавляем только по одной — жёстко фиксируем это на сервере.
      pageCount: 1,
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues?.[0];
      return { ok: false, error: first?.message ?? "Invalid generation parameters" };
    }
    return { ok: false, error: "Invalid generation parameters" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not configured" };

  const prompt = buildGeneratePrompt(parsedParams);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
    // Node/Next supports AbortSignal.timeout in modern runtimes; if not, we proceed without a hard timeout.
    const signal =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (AbortSignal as any).timeout(45_000)
        : undefined;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!resp.ok) {
      // Не прокидываем body наружу: там могут быть внутренние детали/квоты/трассировки.
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, error: "Gemini authorization failed. Check GEMINI_API_KEY." };
      }
      if (resp.status === 429) {
        return { ok: false, error: "Gemini rate limit exceeded. Try again later." };
      }
      return { ok: false, error: `Gemini request failed (${resp.status}). Try again later.` };
    }

    type GeminiPart = { text?: string };
    type GeminiResponse = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
    const json = (await resp.json()) as GeminiResponse;
    const textParts: string[] =
      json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => (typeof p?.text === "string" ? p.text : "")).filter(Boolean) ??
      [];
    const text = textParts.join("\n").trim();
    const jsonStr = extractFirstJsonObject(text) ?? text;

    let draftUnknown: unknown;
    try {
      draftUnknown = JSON.parse(jsonStr);
    } catch {
      return { ok: false, error: "Model did not return valid JSON" };
    }

    const draft = GeneratedDraftSchema.parse(draftUnknown);
    const allowed = new Set(parsedParams.allowedTypes);
    if (draft.pages.length !== parsedParams.pageCount) {
      return { ok: false, error: `Model returned ${draft.pages.length} pages, expected ${parsedParams.pageCount}` };
    }
    for (let i = 0; i < draft.pages.length; i++) {
      const p = draft.pages[i];
      if (!allowed.has(p.type as TestType)) {
        return { ok: false, error: `Model returned disallowed page type: ${p.type}` };
      }
      if (p.questions.length !== parsedParams.questionsPerPage) {
        return {
          ok: false,
          error: `Model returned ${p.questions.length} questions on page ${i + 1}, expected ${parsedParams.questionsPerPage}`,
        };
      }
    }
    const normalized = normalizeGeneratedDraft(draft);
    return { ok: true, pages: normalized.pages, ...(normalized.theoryBlocks ? { theoryBlocks: normalized.theoryBlocks } : {}) };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: "Model returned JSON in an unexpected format" };
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    // Безопасно отдаём только короткие сообщения.
    if (/abort/i.test(message) || /timeout/i.test(message)) {
      return { ok: false, error: "Gemini request timed out. Try again." };
    }
    return { ok: false, error: message || "Unknown error" };
  }
}
