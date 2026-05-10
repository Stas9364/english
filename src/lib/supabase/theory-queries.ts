import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import type { TheoryBlock } from "./types";

const getTheoryBlocksTag = (quizId: string) => `theory-blocks:quiz:${quizId}`;

/** Блоки теории квиза (для админки и отображения) */
export async function getTheoryBlocks(
  supabase: SupabaseClient,
  quizId: string
): Promise<TheoryBlock[]> {
  const theoryTag = getTheoryBlocksTag(quizId);
  const getTheoryBlocksCached = unstable_cache(
    async (targetQuizId: string): Promise<TheoryBlock[]> => {
      const { data, error } = await supabase
        .from("theory_blocks")
        .select("id, quiz_id, type, content, order_index, created_at")
        .eq("quiz_id", targetQuizId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as TheoryBlock[];
    },
    ["theory-blocks:by-quiz"],
    { tags: [theoryTag] }
  );

  return getTheoryBlocksCached(quizId);
}

export function revalidateTheoryBlocksByQuizId(quizId: string) {
  revalidateTag(getTheoryBlocksTag(quizId), "max");
}
