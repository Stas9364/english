import type { SupabaseClient } from "@supabase/supabase-js";
import type { TheoryBlock } from "./types";

/** Блоки теории квиза (для админки и отображения) */
export async function getTheoryBlocks(
  supabase: SupabaseClient,
  quizId: string
): Promise<TheoryBlock[]> {
  const { data, error } = await supabase
    .from("theory_blocks")
    .select("id, quiz_id, type, content, order_index, created_at")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TheoryBlock[];
}
