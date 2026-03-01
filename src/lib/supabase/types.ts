/** Тип страницы квиза: один правильный, несколько, ввод текста или выбор в пропусках */
export type TestType = "single" | "multiple" | "input" | "select_gaps";

/** Квиз (общее задание) */
export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  created_at: string;
}

/** Страница квиза (один тип вопросов на странице) */
export interface QuizPage {
  id: string;
  quiz_id: string;
  type: TestType;
  title: string | null;
  order_index: number;
}

/** Вопрос (привязан к странице) */
export interface Question {
  id: string;
  page_id: string;
  question_title: string;
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

/** Страница квиза с вопросами и вариантами */
export interface QuizPageWithDetails extends QuizPage {
  questions: QuestionWithOptions[];
}

/** Квиз со всеми страницами (для прохождения и админки) */
export interface QuizWithPages extends Quiz {
  pages: QuizPageWithDetails[];
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
