"use server";

export type { CreateQuizInput, TheoryBlockInput, UpdateQuizInput } from "./actions/types";
import {
  getTopicsForQuizForm as getTopicsForQuizFormAction,
  createTopic as createTopicAction,
  updateTopic as updateTopicAction,
  deleteTopic as deleteTopicAction,
} from "./actions/topic-actions";
import {
  createQuiz as createQuizAction,
  updateQuiz as updateQuizAction,
  deleteQuiz as deleteQuizAction,
  deleteQuizPage as deleteQuizPageAction,
  deleteQuestion as deleteQuestionAction,
  deleteOption as deleteOptionAction,
} from "./actions/quiz-actions";
import {
  uploadTheoryImage as uploadTheoryImageAction,
  deleteTheoryBlock as deleteTheoryBlockAction,
  deleteQuestionImage as deleteQuestionImageAction,
} from "./actions/media-actions";
import type { CreateQuizInput, UpdateQuizInput } from "./actions/types";

export async function getTopicsForQuizForm() {
  return getTopicsForQuizFormAction();
}

export async function createTopic(
  payload: Parameters<typeof createTopicAction>[0]
) {
  return createTopicAction(payload);
}

export async function updateTopic(
  topicId: Parameters<typeof updateTopicAction>[0],
  payload: Parameters<typeof updateTopicAction>[1]
) {
  return updateTopicAction(topicId, payload);
}

export async function deleteTopic(
  topicId: Parameters<typeof deleteTopicAction>[0]
) {
  return deleteTopicAction(topicId);
}

export async function createQuiz(data: CreateQuizInput) {
  return createQuizAction(data);
}

export async function updateQuiz(data: UpdateQuizInput) {
  return updateQuizAction(data);
}

export async function deleteQuiz(
  quizId: Parameters<typeof deleteQuizAction>[0]
) {
  return deleteQuizAction(quizId);
}

export async function deleteQuizPage(
  pageId: Parameters<typeof deleteQuizPageAction>[0]
) {
  return deleteQuizPageAction(pageId);
}

export async function deleteQuestion(
  questionId: Parameters<typeof deleteQuestionAction>[0]
) {
  return deleteQuestionAction(questionId);
}

export async function deleteQuestionImage(
  questionId: Parameters<typeof deleteQuestionImageAction>[0]
) {
  return deleteQuestionImageAction(questionId);
}

export async function deleteOption(
  optionId: Parameters<typeof deleteOptionAction>[0]
) {
  return deleteOptionAction(optionId);
}

export async function uploadTheoryImage(formData: FormData) {
  return uploadTheoryImageAction(formData);
}

export async function deleteTheoryBlock(
  blockId: Parameters<typeof deleteTheoryBlockAction>[0]
) {
  return deleteTheoryBlockAction(blockId);
}
