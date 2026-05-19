import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache, updateTag } from "next/cache";
import type { Chapter } from "@/lib/chapters";
import { shuffleArray } from "@/lib/utils";
import type { Option, Quiz, QuizPageWithDetails, QuizWithPages } from "./types";
import { getTopicBySlugAndChapter } from "./topics-queries";
import { getQuizListeningMetaByQuizId } from "./quiz-listenings-meta-queries";

const QUIZZES_LIST_TAG = "quizzes:list";
const getQuizBySlugTag = (slug: string) => `quizzes:slug:${slug.trim().toLowerCase()}`;

const getQuizzesByTopicSlugAndChapterTag = (topicSlug: string, chapter: Chapter) =>
  `quizzes:by-topic-chapter:${String(chapter).trim().toLowerCase()}:${topicSlug.trim().toLowerCase()}`;

/** Список всех квизов для главной и админки */
export async function getQuizzes(
  supabase: SupabaseClient
): Promise<Quiz[]> {
  const getQuizzesCached = unstable_cache(
    async (): Promise<Quiz[]> => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, topic_id, title, description, slug, created_at")
        .order("title", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Quiz[];
    },
    ["quizzes:list"],
    { tags: [QUIZZES_LIST_TAG] }
  );

  return getQuizzesCached();
}

/** Немедленный сброс тегов Data Cache (`updateTag` — только из Server Actions). */
export function revalidateQuizzes() {
  updateTag(QUIZZES_LIST_TAG);
}

export function revalidateQuizBySlug(slug: string) {
  updateTag(getQuizBySlugTag(slug));
}

export function revalidateQuizzesByTopicSlugAndChapter(
  topicSlug: string,
  chapter: Chapter
) {
  updateTag(getQuizzesByTopicSlugAndChapterTag(topicSlug, chapter));
}

/** Квизы темы в контексте раздела (`/admin/[chapter]/[topicSlug]`) */
export async function getQuizzesByTopicSlugAndChapter(
  supabase: SupabaseClient,
  topicSlug: string,
  chapter: Chapter
): Promise<Quiz[]> {
  const slugForQuery = topicSlug.trim();
  const chapterKey = String(chapter).trim();
  const listTag = getQuizzesByTopicSlugAndChapterTag(slugForQuery, chapterKey);
  const getQuizzesByTopicSlugAndChapterCached = unstable_cache(
    async (): Promise<Quiz[]> => {
      const topic = await getTopicBySlugAndChapter(
        supabase,
        slugForQuery,
        chapterKey
      );
      if (!topic) return [];

      const { data, error } = await supabase
        .from("quizzes")
        .select("id, topic_id, title, description, slug, created_at")
        .eq("topic_id", topic.id)
        .order("title", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Quiz[];
    },
    ["quizzes:by-topic-chapter", chapterKey.toLowerCase(), slugForQuery.toLowerCase()],
    { tags: [listTag] }
  );

  return getQuizzesByTopicSlugAndChapterCached();
}

/** Квиз по id со всеми страницами, вопросами и вариантами */
export async function getQuizWithPages(
  supabase: SupabaseClient,
  quizId: string
): Promise<QuizWithPages | null> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, topic_id, title, description, slug, created_at")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) return null;
  const video = await getQuizListeningMetaByQuizId(supabase, quizId);

  const { data: pagesData, error: pagesError } = await supabase
    .from("quiz_pages")
    .select("id, quiz_id, type, title, example, order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (pagesError) throw pagesError;

  const pageIds = (pagesData ?? []).map((p) => p.id);
  if (pageIds.length === 0) {
    return { ...(quiz as Quiz), pages: [], video } as QuizWithPages;
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select(
      "id, page_id, question_title, question_image_url, explanation, order_index, created_at"
    )
    .in("page_id", pageIds)
    .order("order_index", { ascending: true });

  if (questionsError) throw questionsError;

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: options, error: optionsError } = await supabase
    .from("options")
    .select("id, question_id, option_text, is_correct, gap_index")
    .in("question_id", questionIds.length ? questionIds : [""])
    .order("question_id")
    .order("gap_index", { ascending: true, nullsFirst: true });

  if (optionsError) throw optionsError;

  const optionsByQuestion = (options ?? []).reduce<Record<string, Option[]>>(
    (acc, opt) => {
      const id = opt.question_id;
      if (!acc[id]) acc[id] = [];
      acc[id].push(opt as Option);
      return acc;
    },
    {}
  );

  const questionsByPage = (questions ?? []).reduce<
    Record<string, QuizPageWithDetails["questions"]>
  >((acc, q) => {
    const pid = q.page_id;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push({
      ...q,
      options: shuffleArray(optionsByQuestion[q.id] ?? []),
    });
    return acc;
  }, {});

  const pages: QuizPageWithDetails[] = (pagesData ?? []).map((p) => ({
    ...p,
    questions: questionsByPage[p.id] ?? [],
  }));

  return { ...(quiz as Quiz), pages, video } as QuizWithPages;
}

/** Квиз по slug (для маршрута /quiz/[slug]) */
export async function getQuizWithPagesBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<QuizWithPages | null> {
  const normalizedSlug = slug.trim();
  const quizSlugTag = getQuizBySlugTag(normalizedSlug);
  const getQuizWithPagesBySlugCached = unstable_cache(
    async (): Promise<QuizWithPages | null> => {
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("id, topic_id, title, description, slug, created_at")
        .eq("slug", normalizedSlug)
        .single();

      if (quizError || !quiz) return null;
      return getQuizWithPages(supabase, quiz.id);
    },
    ["quizzes:with-pages-by-slug", normalizedSlug],
    { tags: [quizSlugTag] }
  );

  return getQuizWithPagesBySlugCached();
}
