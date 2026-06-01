import type { Chapter } from "@/lib/chapters";

/** Тип страницы квиза: вопросы, соответствие или встроенный кроссворд */
export type TestType = "single" | "multiple" | "input" | "select_gaps" | "matching" | "crossword";

/** Тема квизов (одна тема -> много квизов) */
export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  chapter: Chapter;
  created_at: string;
}

/** Раздел админки (глава), источник истины — таблица `chapters` */
export interface AdminChapter {
  id: string;
  key: string;
  name: string;
  order_index: number;
}

/** Квиз (общее задание) */
export interface Quiz {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  slug: string;
  created_at: string;
}

/** Мета listening-квиза: ссылка на клип */
export interface QuizVideo {
  id: string;
  quiz_id: string;
  url: string;
  created_at: string;
}

/** Страница квиза (один тип вопросов на странице) */
export interface QuizPage {
  id: string;
  quiz_id: string;
  type: TestType;
  title: string | null;
  example: string | null;
  order_index: number;
}

/** Вопрос (привязан к странице) */
export interface Question {
  id: string;
  page_id: string;
  question_title: string;
  question_image_url?: string | null;
  explanation: string | null;
  order_index: number;
  created_at: string;
}

/** Вариант ответа */
export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  /** Для input и select_gaps с несколькими [[]]: индекс пропуска (0-based). null/0 = один пропуск. */
  gap_index?: number | null;
}

/** Вопрос с вариантами ответов */
export interface QuestionWithOptions extends Question {
  options: Option[];
}

export type CrosswordDirection = "across" | "down";

export interface CrosswordGridCell {
  letter: string | null;
  number?: number;
}

export interface CrosswordGridSnapshot {
  width: number;
  height: number;
  cells: CrosswordGridCell[][];
}

export interface CrosswordEntry {
  id: string;
  puzzle_id: string;
  answer: string;
  clue: string;
  direction: CrosswordDirection;
  row: number;
  col: number;
  number: number;
  order_index: number;
  created_at: string;
}

export interface CrosswordPuzzle {
  id: string;
  quiz_id: string;
  width: number;
  height: number;
  grid: CrosswordGridSnapshot;
  created_at: string;
  updated_at: string;
  entries: CrosswordEntry[];
}

export interface CrosswordQuiz extends Quiz {
  crossword: CrosswordPuzzle;
}

export interface LinkedCrossword {
  quiz: CrosswordQuiz;
}

/** Страница квиза с вопросами/вариантами или linked crossword */
export interface QuizPageWithDetails extends QuizPage {
  questions: QuestionWithOptions[];
  crossword: LinkedCrossword | null;
}

/** Квиз со всеми страницами (для прохождения и админки) */
export interface QuizWithPages extends Quiz {
  pages: QuizPageWithDetails[];
  video: QuizVideo | null;
}

/** Тип блока теории: текст или изображение (URL) */
export type TheoryBlockType = "text" | "image";

/** Блок теории (привязан к квизу) */
export interface TheoryBlock {
  id: string;
  quiz_id: string;
  type: TheoryBlockType;
  content: string;
  order_index: number;
  created_at: string;
}
