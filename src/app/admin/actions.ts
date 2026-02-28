"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TestType } from "@/lib/supabase";

export type CreateQuizInput = {
  title: string;
  description: string;
  slug: string;
  pages: {
    type: TestType;
    title?: string | null;
    order_index: number;
    questions: {
      question_title: string;
      explanation?: string | null;
      correct_answer_text?: string | null;
      order_index: number;
      options: { option_text: string; is_correct: boolean }[];
    }[];
  }[];
};

export async function createQuiz(data: CreateQuizInput) {
  const supabase = await createServerClient();

  let slug = data.slug.trim();
  let quiz: { id: string } | null = null;
  let quizError: { code?: string; message?: string } | null = null;

  while (true) {
    const result = await supabase
      .from("quizzes")
      .insert({
        title: data.title,
        description: data.description || null,
        slug,
      })
      .select("id")
      .single();

    quizError = result.error;
    quiz = result.data;

    if (!quizError) break;
    if (quizError.code === "23505") {
      slug = `${slug}-2`;
      continue;
    }
    return { ok: false, error: quizError?.message ?? "Failed to create quiz" };
  }

  if (!quiz) {
    return { ok: false, error: "Failed to create quiz" };
  }

  for (let pi = 0; pi < data.pages.length; pi++) {
    const page = data.pages[pi];
    const { data: quizPage, error: pageError } = await supabase
      .from("quiz_pages")
      .insert({
        quiz_id: quiz.id,
        type: page.type,
        title: page.title || null,
        order_index: page.order_index,
      })
      .select("id")
      .single();

    if (pageError || !quizPage) {
      return { ok: false, error: pageError?.message ?? "Failed to create page" };
    }

    for (let qi = 0; qi < page.questions.length; qi++) {
      const q = page.questions[qi];
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({
          page_id: quizPage.id,
          question_title: q.question_title,
          explanation: q.explanation || null,
          correct_answer_text: null,
          order_index: q.order_index,
        })
        .select("id")
        .single();

      if (questionError || !question) {
        return { ok: false, error: questionError?.message ?? "Failed to create question" };
      }

      if (page.type !== "input" && q.options.length === 0) {
        return { ok: false, error: "Choice page must have at least one option per question" };
      }
      const optionsToInsert = (page.type === "input"
        ? q.options.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ question_id: question.id, option_text: o.option_text.trim(), is_correct: true }))
        : q.options.map((o) => ({ question_id: question.id, option_text: o.option_text, is_correct: o.is_correct }))
      );
      if (optionsToInsert.length > 0) {
        const { error: optionsError } = await supabase.from("options").insert(optionsToInsert);
        if (optionsError) return { ok: false, error: optionsError.message };
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export type UpdateQuizInput = {
  quizId: string;
  title: string;
  description: string;
  slug: string;
  pages: {
    id?: string;
    type: TestType;
    title?: string | null;
    order_index: number;
    questions: {
      id?: string;
      question_title: string;
      explanation?: string | null;
      correct_answer_text?: string | null;
      order_index: number;
      options: { id?: string; option_text: string; is_correct: boolean }[];
    }[];
  }[];
};

export async function updateQuiz(data: UpdateQuizInput) {
  const supabase = await createServerClient();

  const { error: quizError } = await supabase
    .from("quizzes")
    .update({
      title: data.title,
      description: data.description || null,
      slug: data.slug.trim(),
    })
    .eq("id", data.quizId);

  if (quizError) return { ok: false, error: quizError.message };

  const { data: existingPages } = await supabase
    .from("quiz_pages")
    .select("id")
    .eq("quiz_id", data.quizId);
  const existingPageIds = new Set((existingPages ?? []).map((p) => p.id));
  const keptPageIds: string[] = [];

  for (const page of data.pages) {
    let pageId: string;

    if (page.id && existingPageIds.has(page.id)) {
      pageId = page.id;
      const { error: up } = await supabase
        .from("quiz_pages")
        .update({
          type: page.type,
          title: page.title || null,
          order_index: page.order_index,
        })
        .eq("id", pageId);
      if (up) return { ok: false, error: up.message };
    } else {
      const { data: inserted, error: ins } = await supabase
        .from("quiz_pages")
        .insert({
          quiz_id: data.quizId,
          type: page.type,
          title: page.title || null,
          order_index: page.order_index,
        })
        .select("id")
        .single();
      if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert page" };
      pageId = inserted.id;
    }
    keptPageIds.push(pageId);

    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("id")
      .eq("page_id", pageId);
    const existingQuestionIds = new Set((existingQuestions ?? []).map((q) => q.id));
    const keptQuestionIds: string[] = [];

    for (const q of page.questions) {
      let questionId: string;

      if (q.id && existingQuestionIds.has(q.id)) {
        questionId = q.id;
        const { error: up } = await supabase
          .from("questions")
          .update({
            question_title: q.question_title,
            explanation: q.explanation || null,
            correct_answer_text: null,
            order_index: q.order_index,
          })
          .eq("id", questionId);
        if (up) return { ok: false, error: up.message };
      } else {
        const { data: inserted, error: ins } = await supabase
          .from("questions")
          .insert({
            page_id: pageId,
            question_title: q.question_title,
            explanation: q.explanation || null,
            correct_answer_text: null,
            order_index: q.order_index,
          })
          .select("id")
          .single();
        if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert question" };
        questionId = inserted.id;
      }
      keptQuestionIds.push(questionId);

      const { data: existingOpts } = await supabase
        .from("options")
        .select("id")
        .eq("question_id", questionId);
      const existingOptIds = new Set((existingOpts ?? []).map((o) => o.id));

      const isInput = page.type === "input";
      const optionsToSync = isInput
        ? q.options.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: true as boolean }))
        : q.options;

      if (!isInput && optionsToSync.length === 0) {
        return { ok: false, error: "Choice page must have at least one option per question" };
      }

      const keptOptIds: string[] = [];
      for (const o of optionsToSync) {
        if (o.id && existingOptIds.has(o.id)) {
          keptOptIds.push(o.id);
          const { error: up } = await supabase
            .from("options")
            .update({ option_text: o.option_text, is_correct: isInput ? true : o.is_correct })
            .eq("id", o.id);
          if (up) return { ok: false, error: up.message };
        } else {
          const { data: inserted, error: ins } = await supabase
            .from("options")
            .insert({
              question_id: questionId,
              option_text: o.option_text,
              is_correct: isInput ? true : o.is_correct,
            })
            .select("id")
            .single();
          if (ins || !inserted) return { ok: false, error: ins?.message ?? "Failed to insert option" };
          keptOptIds.push(inserted.id);
        }
      }
      const toDel = (existingOpts ?? []).filter((x) => !keptOptIds.includes(x.id)).map((x) => x.id);
      if (toDel.length) {
        const { error: del } = await supabase.from("options").delete().in("id", toDel);
        if (del) return { ok: false, error: del.message };
      }
    }

    const toDelQ = (existingQuestions ?? []).filter((x) => !keptQuestionIds.includes(x.id)).map((x) => x.id);
    if (toDelQ.length) {
      const { error: del } = await supabase.from("questions").delete().in("id", toDelQ);
      if (del) return { ok: false, error: del.message };
    }
  }

  const toDelP = (existingPages ?? []).filter((x) => !keptPageIds.includes(x.id)).map((x) => x.id);
  if (toDelP.length) {
    const { error: del } = await supabase.from("quiz_pages").delete().in("id", toDelP);
    if (del) return { ok: false, error: del.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/quiz/${data.quizId}`);
  return { ok: true };
}
