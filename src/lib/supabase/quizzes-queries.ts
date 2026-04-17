import type { SupabaseClient } from "@supabase/supabase-js";
import type { Chapter } from "@/lib/chapters";
import type { Option, Quiz, QuizPageWithDetails, QuizWithPages } from "./types";
import { getTopicBySlug, getTopicBySlugAndChapter } from "./topics-queries";

/** Список всех квизов для главной и админки */
export async function getQuizzes(
  supabase: SupabaseClient
): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, topic_id, title, description, slug, created_at")
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Quiz[];
}

/** Квизы по topic slug (legacy: без фильтра по разделу) */
export async function getQuizzesByTopicSlug(
  supabase: SupabaseClient,
  topicSlug: string
): Promise<Quiz[]> {
  const topic = await getTopicBySlug(supabase, topicSlug);
  if (!topic) return [];

  const { data, error } = await supabase
    .from("quizzes")
    .select("id, topic_id, title, description, slug, created_at")
    .eq("topic_id", topic.id)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Quiz[];
}

/** Квизы темы в контексте раздела (`/admin/[chapter]/[topicSlug]`) */
export async function getQuizzesByTopicSlugAndChapter(
  supabase: SupabaseClient,
  topicSlug: string,
  chapter: Chapter
): Promise<Quiz[]> {
  const topic = await getTopicBySlugAndChapter(supabase, topicSlug, chapter);
  if (!topic) return [];

  const { data, error } = await supabase
    .from("quizzes")
    .select("id, topic_id, title, description, slug, created_at")
    .eq("topic_id", topic.id)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Quiz[];
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

  const { data: pagesData, error: pagesError } = await supabase
    .from("quiz_pages")
    .select("id, quiz_id, type, title, example, order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (pagesError) throw pagesError;

  const pageIds = (pagesData ?? []).map((p) => p.id);
  if (pageIds.length === 0) {
    return { ...(quiz as Quiz), pages: [] } as QuizWithPages;
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
      options: optionsByQuestion[q.id] ?? [],
    });
    return acc;
  }, {});

  const pages: QuizPageWithDetails[] = (pagesData ?? []).map((p) => ({
    ...p,
    questions: questionsByPage[p.id] ?? [],
  }));

  return { ...(quiz as Quiz), pages } as QuizWithPages;
}

/** Квиз по slug (для маршрута /quiz/[slug]) */
export async function getQuizWithPagesBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<QuizWithPages | null> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, topic_id, title, description, slug, created_at")
    .eq("slug", slug)
    .single();

  if (quizError || !quiz) return null;
  return getQuizWithPages(supabase, quiz.id);
}
