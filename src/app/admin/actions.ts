"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CreateQuizInput = {
  title: string;
  description: string;
  questions: {
    question_text: string;
    explanation: string;
    options: { option_text: string; is_correct: boolean }[];
  }[];
};

export async function createQuiz(data: CreateQuizInput) {
  const supabase = await createServerClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({ title: data.title, description: data.description || null })
    .select("id")
    .single();

  if (quizError || !quiz) {
    return { ok: false, error: quizError?.message ?? "Failed to create quiz" };
  }

  for (const q of data.questions) {
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert({
        quiz_id: quiz.id,
        question_text: q.question_text,
        explanation: q.explanation || null,
      })
      .select("id")
      .single();

    if (questionError || !question) {
      return { ok: false, error: questionError?.message ?? "Failed to create question" };
    }

    if (q.options.length === 0) {
      return { ok: false, error: "Each question must have at least one option" };
    }

    const optionsToInsert = q.options.map((o) => ({
      question_id: question.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
    }));

    const { error: optionsError } = await supabase.from("options").insert(optionsToInsert);
    if (optionsError) {
      return { ok: false, error: optionsError.message };
    }
  }

  revalidatePath("/");
  return { ok: true };
}

export type UpdateQuizInput = {
  quizId: string;
  title: string;
  description: string;
  questions: {
    id?: string;
    question_text: string;
    explanation: string;
    options: { id?: string; option_text: string; is_correct: boolean }[];
  }[];
};

export async function updateQuiz(data: UpdateQuizInput) {
  const supabase = await createServerClient();

  const { error: quizError } = await supabase
    .from("quizzes")
    .update({
      title: data.title,
      description: data.description || null,
    })
    .eq("id", data.quizId);

  if (quizError) {
    return { ok: false, error: quizError.message };
  }

  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("quiz_id", data.quizId);
  const existingQuestionIds = new Set((existingQuestions ?? []).map((q) => q.id));

  const keptQuestionIds: string[] = [];

  for (const q of data.questions) {
    let questionId: string;

    if (q.id && existingQuestionIds.has(q.id)) {
      questionId = q.id;
      const { error: updateErr } = await supabase
        .from("questions")
        .update({
          question_text: q.question_text,
          explanation: q.explanation || null,
        })
        .eq("id", questionId);
      if (updateErr) return { ok: false, error: updateErr.message };
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("questions")
        .insert({
          quiz_id: data.quizId,
          question_text: q.question_text,
          explanation: q.explanation || null,
        })
        .select("id")
        .single();
      if (insertErr || !inserted) return { ok: false, error: insertErr?.message ?? "Failed to insert question" };
      questionId = inserted.id;
    }
    keptQuestionIds.push(questionId);

    if (q.options.length === 0) {
      return { ok: false, error: "Each question must have at least one option" };
    }

    const { data: existingOptions } = await supabase
      .from("options")
      .select("id")
      .eq("question_id", questionId);
    const existingOptionIds = new Set((existingOptions ?? []).map((o) => o.id));
    const keptOptionIds: string[] = [];

    for (const o of q.options) {
      if (o.id && existingOptionIds.has(o.id)) {
        keptOptionIds.push(o.id);
        const { error: updateOptErr } = await supabase
          .from("options")
          .update({ option_text: o.option_text, is_correct: o.is_correct })
          .eq("id", o.id);
        if (updateOptErr) return { ok: false, error: updateOptErr.message };
      } else {
        const { data: insertedOpt, error: insertOptErr } = await supabase
          .from("options")
          .insert({
            question_id: questionId,
            option_text: o.option_text,
            is_correct: o.is_correct,
          })
          .select("id")
          .single();
        if (insertOptErr || !insertedOpt) return { ok: false, error: insertOptErr?.message ?? "Failed to insert option" };
        keptOptionIds.push(insertedOpt.id);
      }
    }

    const toDeleteOpt = (existingOptions ?? []).filter((opt) => !keptOptionIds.includes(opt.id)).map((opt) => opt.id);
    if (toDeleteOpt.length > 0) {
      const { error: delErr } = await supabase.from("options").delete().in("id", toDeleteOpt);
      if (delErr) return { ok: false, error: delErr.message };
    }
  }

  const toDeleteQ = (existingQuestions ?? []).filter((q) => !keptQuestionIds.includes(q.id)).map((q) => q.id);
  if (toDeleteQ.length > 0) {
    const { error: delQErr } = await supabase.from("questions").delete().in("id", toDeleteQ);
    if (delQErr) return { ok: false, error: delQErr.message };
  }

  revalidatePath("/");
  revalidatePath(`/admin`);
  revalidatePath(`/admin/quiz/${data.quizId}`);
  return { ok: true };
}
