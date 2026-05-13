import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache, updateTag } from "next/cache";
import type { TheoryBlock } from "./types";

const getTheoryBlocksTag = (quizId: string) => `theory-blocks:quiz:${quizId}`;

/** Блоки теории квиза (для админки и отображения) */
export async function getTheoryBlocks(
  supabase: SupabaseClient,
  quizId: string
): Promise<TheoryBlock[]> {
  const theoryTag = getTheoryBlocksTag(quizId);
  const getTheoryBlocksCached = unstable_cache(
    async (): Promise<TheoryBlock[]> => {
      const { data, error } = await supabase
        .from("theory_blocks")
        .select("id, quiz_id, type, content, order_index, created_at")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as TheoryBlock[];
    },
    ["theory-blocks:by-quiz", quizId],
    { tags: [theoryTag] }
  );

  return getTheoryBlocksCached();
}

/** Немедленный сброс тега (`updateTag` — только из Server Actions). */
export function revalidateTheoryBlocksByQuizId(quizId: string) {
  updateTag(getTheoryBlocksTag(quizId));
}
