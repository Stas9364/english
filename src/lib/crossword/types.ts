import type { CrosswordDirection, CrosswordGridSnapshot } from "@/lib/supabase";

export type CrosswordWordInput = {
  answer: string;
  clue: string;
};

export type CrosswordPlacedEntry = {
  answer: string;
  clue: string;
  direction: CrosswordDirection;
  row: number;
  col: number;
  number: number;
  order_index: number;
};

export type CrosswordLayout = {
  width: number;
  height: number;
  grid: CrosswordGridSnapshot;
  entries: CrosswordPlacedEntry[];
};

export type CrosswordValidationResult =
  | { ok: true; layout: CrosswordLayout }
  | { ok: false; error: string; conflictCells?: Set<string> };

export const CROSSWORD_MIN_WORDS = 5;
export const CROSSWORD_MAX_SIZE = 20;
