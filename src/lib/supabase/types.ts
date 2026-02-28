/** Тип страницы квиза: один правильный, несколько или ввод текста */
export type TestType = "single" | "multiple" | "input";

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
