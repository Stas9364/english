/** Тест (квиз) */
export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

/** Вопрос в тесте */
export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  explanation: string | null;
  created_at: string;
}

/** Вариант ответа на вопрос */
export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

/** Вопрос с привязанными вариантами ответов */
export interface QuestionWithOptions extends Question {
  options: Option[];
}

/** Тест с вопросами и вариантами (для страницы прохождения) */
export interface QuizWithDetails extends Quiz {
  questions: QuestionWithOptions[];
}
