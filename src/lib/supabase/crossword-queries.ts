import { unstable_cache, updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CrosswordEntry,
  CrosswordGridSnapshot,
  CrosswordPuzzle,
  CrosswordQuiz,
  Quiz,
} from "./types";

const getCrosswordBySlugTag = (slug: string) => `crossword:slug:${slug.trim().toLowerCase()}`;
const getCrosswordByQuizIdTag = (quizId: string) => `crossword:quiz:${quizId}`;

type CrosswordPuzzleRow = Omit<CrosswordPuzzle, "grid" | "entries"> & {
  grid: CrosswordGridSnapshot;
  crossword_entries?: CrosswordEntry[] | null;
};

type CrosswordQuizRow = Quiz & {
  crossword_puzzles?: CrosswordPuzzleRow[] | CrosswordPuzzleRow | null;
};

function getFirstPuzzle(row: CrosswordQuizRow): CrosswordPuzzleRow | null {
  const puzzle = row.crossword_puzzles;
  if (Array.isArray(puzzle)) return puzzle[0] ?? null;
  return puzzle ?? null;
}

function mapCrosswordQuiz(row: CrosswordQuizRow): CrosswordQuiz | null {
  const puzzle = getFirstPuzzle(row);
  if (!puzzle) return null;

  return {
    id: row.id,
    topic_id: row.topic_id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    created_at: row.created_at,
    crossword: {
      id: puzzle.id,
      quiz_id: puzzle.quiz_id,
      width: puzzle.width,
      height: puzzle.height,
      grid: puzzle.grid,
      created_at: puzzle.created_at,
      updated_at: puzzle.updated_at,
      entries: (puzzle.crossword_entries ?? []).slice().sort((a, b) => a.order_index - b.order_index),
    },
  };
}

export async function getCrosswordQuizBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<CrosswordQuiz | null> {
  const normalizedSlug = slug.trim();
  const tag = getCrosswordBySlugTag(normalizedSlug);
  const getCached = unstable_cache(
    async (): Promise<CrosswordQuiz | null> => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          `
          id, topic_id, title, description, slug, created_at,
          crossword_puzzles (
            id, quiz_id, width, height, grid, created_at, updated_at,
            crossword_entries (
              id, puzzle_id, answer, clue, direction, row, col, number, order_index, created_at
            )
          )
        `
        )
        .eq("slug", normalizedSlug)
        .maybeSingle();

      if (error || !data) return null;
      return mapCrosswordQuiz(data as CrosswordQuizRow);
    },
    ["crossword:slug", normalizedSlug],
    { tags: [tag] }
  );

  return getCached();
}

export async function getCrosswordQuizByQuizId(
  supabase: SupabaseClient,
  quizId: string
): Promise<CrosswordQuiz | null> {
  const tag = getCrosswordByQuizIdTag(quizId);
  const getCached = unstable_cache(
    async (): Promise<CrosswordQuiz | null> => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          `
          id, topic_id, title, description, slug, created_at,
          crossword_puzzles (
            id, quiz_id, width, height, grid, created_at, updated_at,
            crossword_entries (
              id, puzzle_id, answer, clue, direction, row, col, number, order_index, created_at
            )
          )
        `
        )
        .eq("id", quizId)
        .maybeSingle();

      if (error || !data) return null;
      return mapCrosswordQuiz(data as CrosswordQuizRow);
    },
    ["crossword:quiz", quizId],
    { tags: [tag] }
  );

  return getCached();
}

export function revalidateCrosswordBySlug(slug: string) {
  updateTag(getCrosswordBySlugTag(slug));
}

export function revalidateCrosswordByQuizId(quizId: string) {
  updateTag(getCrosswordByQuizIdTag(quizId));
}
