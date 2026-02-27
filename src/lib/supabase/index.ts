export { createClient } from "./client";
export { createServerClient } from "./server";
export { getCurrentUser, getIsAdmin } from "./auth";
export { getQuizzes, getQuizWithDetails } from "./queries";
export type { Quiz, Question, Option, QuestionWithOptions, QuizWithDetails } from "./types";
