export { createClient } from "./client";
export { createServerClient } from "./server";
export { getCurrentUser, getIsAdmin } from "./auth";
export { getQuizzes, getQuizWithPages, getQuizWithPagesBySlug } from "./queries";
export type {
  Quiz,
  QuizPage,
  Question,
  Option,
  QuestionWithOptions,
  QuizWithPages,
  QuizPageWithDetails,
  TestType,
} from "./types";
