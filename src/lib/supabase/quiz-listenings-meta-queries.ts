import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuizVideo } from "./types";

const QUIZ_LISTENINGS_META_SELECT = "id, quiz_id, url, created_at";

/** Последняя meta-запись listening-клипа для квиза. */
export async function getQuizListeningMetaByQuizId(
  supabase: SupabaseClient,
  quizId: string
): Promise<QuizVideo | null> {
  const { data, error } = await supabase
    .from("quiz_listenings_meta")
    .select(QUIZ_LISTENINGS_META_SELECT)
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as QuizVideo;
}

/** Создает новую meta-запись listening-клипа для квиза. */
export async function createQuizListeningMeta(
  supabase: SupabaseClient,
  input: { quiz_id: string; url: string }
): Promise<QuizVideo> {
  const { data, error } = await supabase
    .from("quiz_listenings_meta")
    .insert({
      quiz_id: input.quiz_id,
      url: input.url.trim(),
    })
    .select(QUIZ_LISTENINGS_META_SELECT)
    .single();

  if (error || !data) throw error;
  return data as QuizVideo;
}

/**
 * Upsert-like поведение по quiz_id:
 * - если запись есть, обновляет последнюю
 * - если нет, создает новую
 */
export async function upsertQuizListeningMetaByQuizId(
  supabase: SupabaseClient,
  input: { quiz_id: string; url: string }
): Promise<QuizVideo> {
  const existing = await getQuizListeningMetaByQuizId(supabase, input.quiz_id);

  if (!existing) {
    return createQuizListeningMeta(supabase, input);
  }

  const { data, error } = await supabase
    .from("quiz_listenings_meta")
    .update({ url: input.url.trim() })
    .eq("id", existing.id)
    .select(QUIZ_LISTENINGS_META_SELECT)
    .single();

  if (error || !data) throw error;
  return data as QuizVideo;
}

/** Удаляет все meta-записи listening-клипов по quiz_id. */
export async function deleteQuizListeningMetaByQuizId(
  supabase: SupabaseClient,
  quizId: string
): Promise<void> {
  const { error } = await supabase
    .from("quiz_listenings_meta")
    .delete()
    .eq("quiz_id", quizId);

  if (error) throw error;
}
