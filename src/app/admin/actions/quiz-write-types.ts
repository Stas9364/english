import type { CreateQuizInput, UpdateQuizInput } from "./types";

export type ExistingQuestionRow = { id: string; page_id: string };
export type ExistingOptionRow = { id: string; question_id: string };
export type ExistingBlockRow = { id: string; type: string; content: string | null };

export type NormalizedOptionInput = {
  id?: string;
  option_text: string;
  is_correct: boolean;
  gap_index?: number;
};

export type QuizPageWriteRow = {
  id: string;
  quiz_id: string;
  type: UpdateQuizInput["pages"][number]["type"] | CreateQuizInput["pages"][number]["type"];
  title: string | null;
  example: string | null;
  order_index: number;
};

export type QuestionWriteRow = {
  id: string;
  page_id: string;
  question_title: string;
  question_image_url: string | null;
  explanation: string | null;
  order_index: number;
};

export type OptionInsertRow = {
  question_id: string;
  option_text: string;
  is_correct: boolean;
  gap_index?: number;
};

export type OptionUpsertRow = OptionInsertRow & { id: string };

export type TheoryBlockInsertRow = {
  quiz_id: string;
  type: NonNullable<UpdateQuizInput["theoryBlocks"]>[number]["type"];
  content: string;
  order_index: number;
};

export type TheoryBlockUpsertRow = TheoryBlockInsertRow & { id: string };
