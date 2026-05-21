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

type QuizNestedOptionRow = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  gap_index?: number | null;
};

type QuizNestedQuestionRow = {
  id: string;
  page_id: string;
  question_title: string;
  question_image_url?: string | null;
  explanation?: string | null;
  order_index: number;
  created_at: string;
  options?: QuizNestedOptionRow[] | null;
};

type QuizNestedPageRow = {
  id: string;
  quiz_id: string;
  type: QuizPageWithDetails["type"];
  title?: string | null;
  example?: string | null;
  order_index: number;
  questions?: QuizNestedQuestionRow[] | null;
};

type QuizNestedRow = Quiz & {
  quiz_pages?: QuizNestedPageRow[] | null;
};

function mapNestedQuizToQuizWithPages(
  quiz: QuizNestedRow,
  video: QuizWithPages["video"]
): QuizWithPages {
  const pages: QuizPageWithDetails[] = (quiz.quiz_pages ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((page) => ({
      id: page.id,
      quiz_id: page.quiz_id,
      type: page.type,
      title: page.title ?? null,
      example: page.example ?? null,
      order_index: page.order_index,
      questions: (page.questions ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((question) => ({
          id: question.id,
          page_id: question.page_id,
          question_title: question.question_title,
          question_image_url: question.question_image_url ?? null,
          explanation: question.explanation ?? null,
          order_index: question.order_index,
          created_at: question.created_at,
          options: shuffleArray((question.options ?? []) as Option[]),
        })),
    }));

  return {
    id: quiz.id,
    topic_id: quiz.topic_id,
    title: quiz.title,
    description: quiz.description,
    slug: quiz.slug,
    created_at: quiz.created_at,
    pages,
    video,
  } as QuizWithPages;
}

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
    .select(
      `
      id, topic_id, title, description, slug, created_at,
      quiz_pages (
        id, quiz_id, type, title, example, order_index,
        questions (
          id, page_id, question_title, question_image_url, explanation, order_index, created_at,
          options (
            id, question_id, option_text, is_correct, gap_index
          )
        )
      )
    `
    )
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) return null;
  const video = await getQuizListeningMetaByQuizId(supabase, quiz.id);
  return mapNestedQuizToQuizWithPages(quiz as QuizNestedRow, video);
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
        .select(
          `
          id, topic_id, title, description, slug, created_at,
          quiz_pages (
            id, quiz_id, type, title, example, order_index,
            questions (
              id, page_id, question_title, question_image_url, explanation, order_index, created_at,
              options (
                id, question_id, option_text, is_correct, gap_index
              )
            )
          )
        `
        )
        .eq("slug", normalizedSlug)
        .single();

      if (quizError || !quiz) return null;
      const video = await getQuizListeningMetaByQuizId(supabase, quiz.id);
      return mapNestedQuizToQuizWithPages(quiz as QuizNestedRow, video);
    },
    ["quizzes:with-pages-by-slug", normalizedSlug],
    { tags: [quizSlugTag] }
  );

  return getQuizWithPagesBySlugCached();
}
