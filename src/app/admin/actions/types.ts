import type { Chapter } from "@/lib/chapters";
import type { TestType, TheoryBlockType } from "@/lib/supabase";

export type TheoryBlockInput = {
  id?: string;
  type: TheoryBlockType;
  content: string;
  order_index: number;
};

export type CreateQuizInput = {
  /** Раздел страницы создания — должен совпадать с `chapters.key` выбранной темы */
  chapter: Chapter;
  topic_id: string;
  title: string;
  description: string;
  slug: string;
  /** Listening clip URL (YouTube). Optional for non-listening quizzes. */
  video_url?: string;
  pages: {
    type: TestType;
    title?: string | null;
    example?: string | null;
    order_index: number;
    questions: {
      question_title: string;
      question_image_url?: string | null;
      explanation?: string | null;
      order_index: number;
      options: { option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  theoryBlocks?: Omit<TheoryBlockInput, "id">[];
};

export type UpdateQuizInput = {
  quizId: string;
  topic_id: string;
  title: string;
  description: string;
  slug: string;
  /**
   * Listening clip URL (YouTube).
   * - undefined: keep current value as is
   * - empty string: delete current meta
   * - non-empty string: upsert meta
   */
  video_url?: string;
  pages: {
    id?: string;
    type: TestType;
    title?: string | null;
    example?: string | null;
    order_index: number;
    questions: {
      id?: string;
      question_title: string;
      question_image_url?: string | null;
      explanation?: string | null;
      order_index: number;
      options: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  theoryBlocks?: TheoryBlockInput[];
};
