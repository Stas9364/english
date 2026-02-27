import type { SupabaseClient } from "@supabase/supabase-js";
import type { Option, Quiz, QuizWithDetails } from "./types";

/** Загрузить список всех тестов (для главной страницы). */
export async function getQuizzes(
  supabase: SupabaseClient
): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, description, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Quiz[];
}

/** Загрузить один тест со всеми вопросами и вариантами ответов (для страницы прохождения). */
export async function getQuizWithDetails(
  supabase: SupabaseClient,
  quizId: string
): Promise<QuizWithDetails | null> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, title, description, created_at")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) return null;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, quiz_id, question_text, explanation, created_at")
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: true });

  if (questionsError) throw questionsError;
  if (!questions?.length) {
    return { ...quiz, questions: [] } as QuizWithDetails;
  }

  const questionIds = questions.map((q) => q.id);
  const { data: options, error: optionsError } = await supabase
    .from("options")
    .select("id, question_id, option_text, is_correct")
    .in("question_id", questionIds)
    .order("question_id");

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

  const questionsWithOptions = questions.map((q) => ({
    ...q,
    options: optionsByQuestion[q.id] ?? [],
  }));

  return {
    ...quiz,
    questions: questionsWithOptions,
  } as QuizWithDetails;
}
