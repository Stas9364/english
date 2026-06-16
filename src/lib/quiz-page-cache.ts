import { createServerClient } from "@/lib/supabase";
import {
  getCrosswordQuizBySlug,
  getQuizWithPagesBySlug,
  getTheoryBlocks,
  getTopicMetaById,
} from "@/lib/supabase";
import type { CrosswordQuiz, QuizWithPages, TheoryBlock } from "@/lib/supabase/types";
import {
  getCachedJson,
  getQuizCacheKey,
  QUIZ_CACHE_TTL_SECONDS,
  setCachedJson,
} from "@/lib/redis";

type TopicMeta = { slug: string; chapter: string };

export type QuizPagePayload = {
  quiz: QuizWithPages | null;
  theoryBlocks: TheoryBlock[];
  topicRow: TopicMeta | null;
  crosswordQuiz: CrosswordQuiz | null;
};

export async function getQuizPageDataBySlug(slug: string): Promise<QuizPagePayload> {
  const normalizedSlug = slug.trim();
  const cacheKey = getQuizCacheKey(normalizedSlug);
  const cached = await getCachedJson<QuizPagePayload>(cacheKey);
  if (cached) return cached;

  const supabase = await createServerClient();
  const quiz = await getQuizWithPagesBySlug(supabase, normalizedSlug);
  if (!quiz) {
    return {
      quiz: null,
      theoryBlocks: [],
      topicRow: null,
      crosswordQuiz: null,
    };
  }

  const [theoryBlocks, topicRow] = await Promise.all([
    getTheoryBlocks(supabase, quiz.id),
    getTopicMetaById(supabase, quiz.topic_id),
  ]);

  let crosswordQuiz: CrosswordQuiz | null = null;
  if (topicRow?.chapter.trim().toLowerCase() === "crossword") {
    crosswordQuiz = await getCrosswordQuizBySlug(supabase, normalizedSlug);
  }

  const payload: QuizPagePayload = {
    quiz,
    theoryBlocks,
    topicRow: topicRow
      ? {
          slug: topicRow.slug,
          chapter: topicRow.chapter,
        }
      : null,
    crosswordQuiz,
  };

  await setCachedJson(cacheKey, payload, QUIZ_CACHE_TTL_SECONDS);
  return payload;
}
