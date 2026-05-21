"use server";

import { getIsAdmin } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase/server";
import {
  revalidateQuizBySlug,
  revalidateQuizzes,
  revalidateQuizzesByTopicSlugAndChapter,
} from "@/lib/supabase/quizzes-queries";
import { revalidateTheoryBlocksByQuizId } from "@/lib/supabase/theory-queries";
import {
  deleteQuizListeningMetaByQuizId,
  upsertQuizListeningMetaByQuizId,
} from "@/lib/supabase/quiz-listenings-meta-queries";
import { countGapMarkers } from "@/lib/quiz-gap-markers";
import { revalidatePath } from "next/cache";
import {
  extractTopicChapterKey,
  getStoragePathFromPublicUrl,
  IMAGES_BUCKET,
  revalidateAdminPathsForQuizId,
  revalidateAdminPathsForTopicId,
} from "./shared";
import type { CreateQuizInput, UpdateQuizInput } from "./types";
import type {
  ExistingBlockRow,
  ExistingOptionRow,
  ExistingQuestionRow,
  NormalizedOptionInput,
  OptionInsertRow,
  OptionUpsertRow,
  QuestionWriteRow,
  QuizPageWriteRow,
  TheoryBlockInsertRow,
  TheoryBlockUpsertRow,
} from "./quiz-write-types";

// Validation helpers
function isListeningChapter(chapterKey: string): boolean {
  return chapterKey.trim().toLowerCase() === "listening";
}

function validateListeningQuizPayload(input: {
  isListening: boolean;
  videoUrl: string;
  pages: Array<{ type: string }>;
}): string | null {
  if (!input.isListening) return null;

  if (!input.videoUrl) {
    return "Listening quiz requires a video URL";
  }

  const hasNonInputPage = input.pages.some((p) => p.type !== "input");
  if (hasNonInputPage) {
    return "Listening quiz supports only input page type";
  }

  return null;
}

function validateSelectGapsMarkers(input: {
  pages: Array<{
    type: string;
    questions: Array<{ question_title?: string | null }>;
  }>;
}): string | null {
  for (let pi = 0; pi < input.pages.length; pi++) {
    const page = input.pages[pi];
    if (page.type !== "select_gaps") continue;

    for (let qi = 0; qi < page.questions.length; qi++) {
      if (countGapMarkers(page.questions[qi].question_title) === 0) {
        return `Dropdown in gaps page ${pi + 1}, question ${qi + 1} must contain at least one [[]] marker`;
      }
    }
  }

  return null;
}

// Cache and topic helpers
async function revalidateTopicQuizListCaches(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  topicIds: Array<string | null | undefined>
) {
  const ids = [...new Set(topicIds.filter(Boolean))] as string[];
  for (const tid of ids) {
    const { data } = await supabase
      .from("topics")
      .select("slug, chapter")
      .eq("id", tid)
      .maybeSingle();
    if (!data?.slug || !data.chapter) continue;
    revalidateQuizzesByTopicSlugAndChapter(data.slug, data.chapter);
  }
}

async function revalidatePublicQuizCacheByQuizId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  quizId: string
) {
  const { data } = await supabase.from("quizzes").select("slug").eq("id", quizId).maybeSingle();
  if (data?.slug) revalidateQuizBySlug(data.slug);
}

async function getTopicChapterKeyByTopicId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  topicId: string
): Promise<{ ok: true; chapterKey: string } | { ok: false; error: string }> {
  const { data: topicRow, error: topicFetchError } = await supabase
    .from("topics")
    .select("chapters:chapters!topics_chapter_id_fkey!inner(key)")
    .eq("id", topicId)
    .single();

  const topicChapter = extractTopicChapterKey(topicRow);
  if (topicFetchError || !topicChapter) {
    return { ok: false, error: "Topic not found" };
  }

  return { ok: true, chapterKey: topicChapter };
}

// Bulk write helpers
function getExistingIdOrCreate(
  maybeId: string | undefined,
  existingIds: Set<string>
): string {
  if (maybeId && existingIds.has(maybeId)) return maybeId;
  return crypto.randomUUID();
}

function normalizeOptionsForSync(
  pageType: UpdateQuizInput["pages"][number]["type"],
  options: UpdateQuizInput["pages"][number]["questions"][number]["options"]
): NormalizedOptionInput[] {
  if (pageType === "input") {
    return options
      .filter((o) => (o.option_text ?? "").trim())
      .map((o) => ({
        id: o.id,
        option_text: o.option_text.trim(),
        is_correct: true,
        gap_index: o.gap_index ?? 0,
      }));
  }

  if (pageType === "select_gaps") {
    return options
      .filter((o) => (o.option_text ?? "").trim())
      .map((o) => ({
        id: o.id,
        option_text: o.option_text.trim(),
        is_correct: o.is_correct,
        gap_index: o.gap_index ?? 0,
      }));
  }

  return options;
}

function getStaleIds<T extends { id: string }>(
  existingRows: T[],
  keptIds: Set<string>
): string[] {
  return existingRows.filter((row) => !keptIds.has(row.id)).map((row) => row.id);
}

export async function createQuiz(data: CreateQuizInput) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();

  const topicChapterResult = await getTopicChapterKeyByTopicId(supabase, data.topic_id);
  if (!topicChapterResult.ok) {
    return { ok: false, error: topicChapterResult.error };
  }
  const topicChapter = topicChapterResult.chapterKey;
  if (topicChapter !== data.chapter) {
    return { ok: false, error: "Topic does not belong to this section" };
  }
  const normalizedVideoUrl = data.video_url?.trim() ?? "";
  const listeningValidationError = validateListeningQuizPayload({
    isListening: isListeningChapter(topicChapter),
    videoUrl: normalizedVideoUrl,
    pages: data.pages,
  });
  if (listeningValidationError) {
    return { ok: false, error: listeningValidationError };
  }
  const selectGapsValidationError = validateSelectGapsMarkers({ pages: data.pages });
  if (selectGapsValidationError) {
    return { ok: false, error: selectGapsValidationError };
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

  const pagesToInsert: QuizPageWriteRow[] = [];
  const questionsToInsert: QuestionWriteRow[] = [];
  const optionsToInsert: OptionInsertRow[] = [];

  for (const page of data.pages) {
    const pageId = crypto.randomUUID();
    pagesToInsert.push({
      id: pageId,
      quiz_id: quiz.id,
      type: page.type,
      title: page.title || null,
      example: page.example || null,
      order_index: page.order_index,
    });

    for (const q of page.questions) {
      const questionId = crypto.randomUUID();
      questionsToInsert.push({
        id: questionId,
        page_id: pageId,
        question_title: q.question_title || "",
        question_image_url: q.question_image_url || null,
        explanation: q.explanation || null,
        order_index: q.order_index,
      });

      const isGapBased = page.type === "input" || page.type === "select_gaps";
      const normalizedOptions = normalizeOptionsForSync(page.type, q.options);

      // single, multiple, matching: require at least one option per question
      if (!isGapBased && normalizedOptions.length === 0) {
        return { ok: false, error: "Choice page must have at least one option per question" };
      }

      optionsToInsert.push(
        ...normalizedOptions.map((o) => ({
          question_id: questionId,
          option_text: o.option_text,
          is_correct: o.is_correct,
          ...(isGapBased ? { gap_index: o.gap_index ?? 0 } : {}),
        }))
      );
    }
  }

  if (pagesToInsert.length > 0) {
    const { error: pagesInsertError } = await supabase.from("quiz_pages").insert(pagesToInsert);
    if (pagesInsertError) return { ok: false, error: pagesInsertError.message };
  }
  if (questionsToInsert.length > 0) {
    const { error: questionsInsertError } = await supabase
      .from("questions")
      .insert(questionsToInsert);
    if (questionsInsertError) return { ok: false, error: questionsInsertError.message };
  }
  if (optionsToInsert.length > 0) {
    const { error: optionsInsertError } = await supabase.from("options").insert(optionsToInsert);
    if (optionsInsertError) return { ok: false, error: optionsInsertError.message };
  }

  const theoryBlocksToInsert: TheoryBlockInsertRow[] =
    data.theoryBlocks?.map((b) => ({
      quiz_id: quiz.id,
      type: b.type,
      content: b.content.trim() || " ",
      order_index: b.order_index,
    })) ?? [];
  if (theoryBlocksToInsert.length > 0) {
    const { error: theoryBlocksInsertError } = await supabase
      .from("theory_blocks")
      .insert(theoryBlocksToInsert);
    if (theoryBlocksInsertError) return { ok: false, error: theoryBlocksInsertError.message };
  }

  if (normalizedVideoUrl) {
    try {
      await upsertQuizListeningMetaByQuizId(supabase, {
        quiz_id: quiz.id,
        url: normalizedVideoUrl,
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to save listening meta" };
    }
  }

  revalidatePath("/");
  revalidateQuizzes();
  revalidateTheoryBlocksByQuizId(quiz.id);
  revalidateQuizBySlug(slug);
  await revalidateTopicQuizListCaches(supabase, [data.topic_id]);
  await revalidateAdminPathsForTopicId(supabase, data.topic_id);
  return { ok: true };
}

export async function updateQuiz(data: UpdateQuizInput) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const normalizedVideoUrl = data.video_url?.trim() ?? "";

  const topicChapterResult = await getTopicChapterKeyByTopicId(supabase, data.topic_id);
  if (!topicChapterResult.ok) {
    return { ok: false, error: topicChapterResult.error };
  }
  const topicChapter = topicChapterResult.chapterKey;
  const listeningValidationError = validateListeningQuizPayload({
    isListening: isListeningChapter(topicChapter),
    videoUrl: normalizedVideoUrl,
    pages: data.pages,
  });
  if (listeningValidationError) {
    return { ok: false, error: listeningValidationError };
  }
  const selectGapsValidationError = validateSelectGapsMarkers({ pages: data.pages });
  if (selectGapsValidationError) {
    return { ok: false, error: selectGapsValidationError };
  }

  const { data: beforeQuiz } = await supabase
    .from("quizzes")
    .select("topic_id, slug")
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

  const { data: existingPages, error: existingPagesError } = await supabase
    .from("quiz_pages")
    .select("id")
    .eq("quiz_id", data.quizId);
  if (existingPagesError) return { ok: false, error: existingPagesError.message };

  const existingPageRows = existingPages ?? [];
  const existingPageIds = new Set(existingPageRows.map((p) => p.id));
  const existingPageIdList = existingPageRows.map((p) => p.id);

  let existingQuestions: ExistingQuestionRow[] = [];
  if (existingPageIdList.length > 0) {
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, page_id")
      .in("page_id", existingPageIdList);
    if (questionsError) return { ok: false, error: questionsError.message };
    existingQuestions = questionsData ?? [];
  }

  const existingQuestionIdsByPageId = new Map<string, Set<string>>();
  for (const row of existingQuestions) {
    const ids = existingQuestionIdsByPageId.get(row.page_id) ?? new Set<string>();
    ids.add(row.id);
    existingQuestionIdsByPageId.set(row.page_id, ids);
  }

  const existingQuestionIdList = existingQuestions.map((q) => q.id);
  let existingOptions: ExistingOptionRow[] = [];
  if (existingQuestionIdList.length > 0) {
    const { data: optionsData, error: optionsError } = await supabase
      .from("options")
      .select("id, question_id")
      .in("question_id", existingQuestionIdList);
    if (optionsError) return { ok: false, error: optionsError.message };
    existingOptions = optionsData ?? [];
  }

  const existingOptionIdsByQuestionId = new Map<string, Set<string>>();
  for (const row of existingOptions) {
    const ids = existingOptionIdsByQuestionId.get(row.question_id) ?? new Set<string>();
    ids.add(row.id);
    existingOptionIdsByQuestionId.set(row.question_id, ids);
  }

  const { data: existingBlocks, error: existingBlocksError } = await supabase
    .from("theory_blocks")
    .select("id, type, content")
    .eq("quiz_id", data.quizId);
  if (existingBlocksError) return { ok: false, error: existingBlocksError.message };

  const keptPageIds = new Set<string>();
  const keptQuestionIds = new Set<string>();
  const keptOptionIds = new Set<string>();
  const keptBlockIds = new Set<string>();

  const pagesToUpsert: QuizPageWriteRow[] = [];
  const questionsToUpsert: QuestionWriteRow[] = [];
  const optionsToUpsert: OptionUpsertRow[] = [];
  const theoryBlocksToUpsert: TheoryBlockUpsertRow[] = [];

  for (const page of data.pages) {
    const pageId = page.id && existingPageIds.has(page.id) ? page.id : crypto.randomUUID();
    keptPageIds.add(pageId);

    pagesToUpsert.push({
      id: pageId,
      quiz_id: data.quizId,
      type: page.type,
      title: page.title || null,
      example: page.example || null,
      order_index: page.order_index,
    });

    const existingQuestionIdsForPage = existingQuestionIdsByPageId.get(pageId) ?? new Set<string>();

    for (const q of page.questions) {
      const questionId = getExistingIdOrCreate(q.id, existingQuestionIdsForPage);
      keptQuestionIds.add(questionId);

      questionsToUpsert.push({
        id: questionId,
        page_id: pageId,
        question_title: q.question_title || "",
        question_image_url: q.question_image_url || null,
        explanation: q.explanation || null,
        order_index: q.order_index,
      });

      const isInput = page.type === "input";
      const isSelectGaps = page.type === "select_gaps";
      const isGapBased = isInput || isSelectGaps;

      const optionsToSync = normalizeOptionsForSync(page.type, q.options);

      if (!isGapBased && optionsToSync.length === 0) {
        return { ok: false, error: "Choice page must have at least one option per question" };
      }

      const existingOptionIdsForQuestion = existingOptionIdsByQuestionId.get(questionId) ?? new Set<string>();

      for (const o of optionsToSync) {
        const optionId = getExistingIdOrCreate(o.id, existingOptionIdsForQuestion);
        keptOptionIds.add(optionId);

        optionsToUpsert.push({
          id: optionId,
          question_id: questionId,
          option_text: o.option_text,
          is_correct: isInput ? true : o.is_correct,
          ...(isGapBased ? { gap_index: "gap_index" in o ? (o.gap_index ?? 0) : 0 } : {}),
        });
      }
    }
  }

  if (pagesToUpsert.length > 0) {
    const { error: pagesUpsertError } = await supabase
      .from("quiz_pages")
      .upsert(pagesToUpsert, { onConflict: "id" });
    if (pagesUpsertError) return { ok: false, error: pagesUpsertError.message };
  }

  if (questionsToUpsert.length > 0) {
    const { error: questionsUpsertError } = await supabase
      .from("questions")
      .upsert(questionsToUpsert, { onConflict: "id" });
    if (questionsUpsertError) return { ok: false, error: questionsUpsertError.message };
  }

  if (optionsToUpsert.length > 0) {
    const { error: optionsUpsertError } = await supabase
      .from("options")
      .upsert(optionsToUpsert, { onConflict: "id" });
    if (optionsUpsertError) return { ok: false, error: optionsUpsertError.message };
  }

  const staleOptionIds = getStaleIds(existingOptions, keptOptionIds);
  if (staleOptionIds.length > 0) {
    const { error: optionsDeleteError } = await supabase
      .from("options")
      .delete()
      .in("id", staleOptionIds);
    if (optionsDeleteError) return { ok: false, error: optionsDeleteError.message };
  }

  const staleQuestionIds = getStaleIds(existingQuestions, keptQuestionIds);
  if (staleQuestionIds.length > 0) {
    const { error: questionsDeleteError } = await supabase
      .from("questions")
      .delete()
      .in("id", staleQuestionIds);
    if (questionsDeleteError) return { ok: false, error: questionsDeleteError.message };
  }

  const stalePageIds = getStaleIds(existingPageRows, keptPageIds);
  if (stalePageIds.length > 0) {
    const { error: pagesDeleteError } = await supabase
      .from("quiz_pages")
      .delete()
      .in("id", stalePageIds);
    if (pagesDeleteError) return { ok: false, error: pagesDeleteError.message };
  }

  const theoryBlocks = data.theoryBlocks ?? [];
  const existingBlockIds = new Set((existingBlocks ?? []).map((b) => b.id));
  for (const b of theoryBlocks) {
    const content = (b.content ?? "").trim() || " ";
    const blockId = getExistingIdOrCreate(b.id, existingBlockIds);
    keptBlockIds.add(blockId);

    theoryBlocksToUpsert.push({
      id: blockId,
      quiz_id: data.quizId,
      type: b.type,
      content,
      order_index: b.order_index,
    });
  }

  if (theoryBlocksToUpsert.length > 0) {
    const { error: theoryUpsertError } = await supabase
      .from("theory_blocks")
      .upsert(theoryBlocksToUpsert, { onConflict: "id" });
    if (theoryUpsertError) return { ok: false, error: theoryUpsertError.message };
  }

  const toDelB = (existingBlocks ?? []).filter((x) => !keptBlockIds.has(x.id));
  if (toDelB.length) {
    const pathsToRemove: string[] = [];
    for (const row of toDelB) {
      const block = row as ExistingBlockRow;
      if (block.type === "image" && block.content) {
        const path = getStoragePathFromPublicUrl(block.content, IMAGES_BUCKET);
        if (path) pathsToRemove.push(path);
      }
    }
    if (pathsToRemove.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from(IMAGES_BUCKET)
        .remove(pathsToRemove);
      if (storageErr) return { ok: false, error: storageErr.message };
    }
    const { error: del } = await supabase
      .from("theory_blocks")
      .delete()
      .in(
        "id",
        toDelB.map((x) => x.id)
      );
    if (del) return { ok: false, error: del.message };
  }

  const isListening = isListeningChapter(topicChapter);
  if (isListening) {
    try {
      await upsertQuizListeningMetaByQuizId(supabase, {
        quiz_id: data.quizId,
        url: normalizedVideoUrl,
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to update listening meta" };
    }
  } else if (data.video_url !== undefined) {
    try {
      if (normalizedVideoUrl) {
        await upsertQuizListeningMetaByQuizId(supabase, {
          quiz_id: data.quizId,
          url: normalizedVideoUrl,
        });
      } else {
        await deleteQuizListeningMetaByQuizId(supabase, data.quizId);
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Failed to update listening meta" };
    }
  }

  revalidatePath("/");
  const newSlug = data.slug.trim();
  revalidatePath(`/admin/quiz/${newSlug}`);
  if (beforeQuiz?.slug && beforeQuiz.slug !== newSlug) {
    revalidatePath(`/admin/quiz/${beforeQuiz.slug}`);
  }
  revalidateQuizzes();
  revalidateTheoryBlocksByQuizId(data.quizId);
  if (beforeQuiz?.slug) revalidateQuizBySlug(beforeQuiz.slug);
  revalidateQuizBySlug(newSlug);
  await revalidateTopicQuizListCaches(supabase, [beforeQuiz?.topic_id, data.topic_id]);
  await revalidateAdminPathsForTopicId(supabase, beforeQuiz?.topic_id);
  await revalidateAdminPathsForTopicId(supabase, data.topic_id);
  return { ok: true };
}

/** Delete a quiz (cascade deletes pages, questions, options, theory blocks). Immediate delete. */
export async function deleteQuiz(
  quizId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: quizRow } = await supabase
    .from("quizzes")
    .select("topic_id, slug")
    .eq("id", quizId)
    .single();

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidateQuizzes();
  revalidateTheoryBlocksByQuizId(quizId);
  if (quizRow?.slug) revalidateQuizBySlug(quizRow.slug);
  await revalidateTopicQuizListCaches(supabase, [quizRow?.topic_id]);
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
  const { data: page } = await supabase
    .from("quiz_pages")
    .select("quiz_id")
    .eq("id", pageId)
    .single();
  const quizId = page?.quiz_id;

  const { error } = await supabase.from("quiz_pages").delete().eq("id", pageId);
  if (error) return { ok: false, error: error.message };

  if (quizId) {
    await revalidateAdminPathsForQuizId(supabase, quizId);
    await revalidatePublicQuizCacheByQuizId(supabase, quizId);
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
  const { data: q } = await supabase
    .from("questions")
    .select("page_id")
    .eq("id", questionId)
    .single();
  let quizId: string | null = null;
  if (q?.page_id) {
    const { data: p } = await supabase
      .from("quiz_pages")
      .select("quiz_id")
      .eq("id", q.page_id)
      .single();
    quizId = p?.quiz_id ?? null;
  }

  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  if (quizId) {
    await revalidateAdminPathsForQuizId(supabase, quizId);
    await revalidatePublicQuizCacheByQuizId(supabase, quizId);
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
  const { data: opt } = await supabase
    .from("options")
    .select("question_id")
    .eq("id", optionId)
    .single();
  let quizId: string | null = null;
  if (opt?.question_id) {
    const { data: q } = await supabase
      .from("questions")
      .select("page_id")
      .eq("id", opt.question_id)
      .single();
    if (q?.page_id) {
      const { data: p } = await supabase
        .from("quiz_pages")
        .select("quiz_id")
        .eq("id", q.page_id)
        .single();
      quizId = p?.quiz_id ?? null;
    }
  }

  const { error } = await supabase.from("options").delete().eq("id", optionId);
  if (error) return { ok: false, error: error.message };

  if (quizId) {
    await revalidateAdminPathsForQuizId(supabase, quizId);
    await revalidatePublicQuizCacheByQuizId(supabase, quizId);
  }
  return { ok: true };
}
