"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  updateQuiz,
  deleteQuizPage,
  deleteQuestion,
  deleteQuestionImage,
  deleteOption,
} from "@/app/admin/actions";
import type { QuizWithPages, TestType, TheoryBlock, TheoryBlockType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuizAiGenerationBlock } from "@/components/quiz-ai-generation-block";
import { QuizTheoryBlocksEditor } from "@/components/quiz-theory-blocks-editor";
import { useQuizAiGeneration, type GenerateQuizSuccess } from "@/hooks/use-quiz-ai-generation";
import { useTheoryBlocks } from "@/hooks/use-theory-blocks";
import { PageBlock } from "@/components/page-block/page-block";
import type { PageBlockFormValues } from "@/components/page-block/page-block";
import type { UseFormReturn } from "react-hook-form";
import { editQuizFormSchema, type EditQuizFormValues } from "@/lib/quiz-page-schema";

type GenerateOk = GenerateQuizSuccess;
function defaultOption(option?: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }, gapIndex?: number) {
  return {
    id: option?.id,
    option_text: option?.option_text ?? "",
    is_correct: option?.is_correct ?? false,
    gap_index: option?.gap_index ?? gapIndex ?? 0,
  };
}

function defaultQuestion(q?: {
  id?: string;
  question_title: string;
  question_image_url?: string | null;
  explanation?: string | null;
  options: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }[];
}, orderIndex?: number) {
  return {
    id: q?.id,
    question_title: q?.question_title ?? "",
    question_image_url: q?.question_image_url ?? "",
    explanation: q?.explanation ?? "",
    order_index: orderIndex ?? 0,
    options: (q?.options?.length ? q.options : [{ option_text: "", is_correct: true, gap_index: 0 }]).map((o) =>
      defaultOption({ id: o.id, option_text: o.option_text, is_correct: o.is_correct ?? true, gap_index: o.gap_index }, o.gap_index)
    ),
  };
}

function defaultQuestionForBlock(orderIndex: number) {
  return defaultQuestion(undefined, orderIndex);
}

function defaultPage(p?: { id?: string; type: TestType; title?: string | null; example?: string | null; questions: { id?: string; question_title: string; question_image_url?: string | null; explanation?: string | null; options: { id?: string; option_text: string; is_correct: boolean }[] }[] }, pageIndex?: number) {
  const type = p?.type ?? "single";
  return {
    id: p?.id,
    type,
    title: p?.title ?? "",
    example: p?.example ?? "",
    order_index: pageIndex ?? 0,
    questions: (p?.questions?.length ? p.questions : [{ question_title: "", question_image_url: "", explanation: "", options: [defaultOption()] }]).map((q, i) =>
      defaultQuestion(q, i)
    ),
  };
}

type TabId = "details" | "theory";

interface EditQuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
}

export function EditQuizScreen({ quiz, theoryBlocks: initialTheoryBlocks = [] }: EditQuizScreenProps) {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const {
    theoryBlocks,
    uploadingImageIndex,
    uploadError,
    addTheoryBlock,
    handleDeleteTheoryBlock,
    moveTheoryBlock,
    updateTheoryBlock,
    handleTheoryImageUpload,
    appendTheoryBlocks,
  } = useTheoryBlocks({
    quizId: quiz.id,
    initialBlocks: initialTheoryBlocks,
    onActionError: (error) => setResult({ ok: false, error }),
  });

  const ai = useQuizAiGeneration({
    initialQuestionsPerPage: 3,
  });
  const [generatedDraft, setGeneratedDraft] = useState<GenerateOk | null>(null);

  const form = useForm<EditQuizFormValues>({
    resolver: zodResolver(editQuizFormSchema),
    defaultValues: {
      title: quiz.title,
      description: quiz.description ?? "",
      slug: quiz.slug,
      pages: quiz.pages?.length
        ? quiz.pages.map((p, i) => defaultPage({ id: p.id, type: p.type, title: p.title, example: p.example, questions: p.questions }, i))
        : [defaultPage(undefined, 0)],
    },
  });

  const pagesArray = useFieldArray({
    control: form.control,
    name: "pages",
  });

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  async function handleGenerate(topicOverride: string) {
    ai.setTopic(topicOverride);
    setGeneratedDraft(null);
    const res = await ai.generate(topicOverride);
    if (!res.ok) return;
    if (res.pages?.length) {
      const startIndex = pagesArray.fields.length;
      res.pages.forEach((p, i) => {
        pagesArray.append(
          defaultPage(
            {
              type: p.type,
              title: p.title ?? null,
              questions: p.questions.map((q) => ({
                question_title: q.question_title,
                question_image_url: null,
                explanation: q.explanation ?? null,
                options: q.options.map((o) => ({
                  option_text: o.option_text,
                  is_correct: o.is_correct,
                  gap_index: o.gap_index ?? 0,
                })),
              })),
            },
            startIndex + i
          )
        );
      });
    }
    if (res.theoryBlocks?.length) {
      appendTheoryBlocks(res.theoryBlocks);
    }
    setGeneratedDraft(res as GenerateOk);
  }

  async function onSubmit(data: EditQuizFormValues) {
    setResult(null);
    const res = await updateQuiz({
      quizId: quiz.id,
      title: data.title,
      description: data.description,
      slug: data.slug,
      pages: data.pages.map((p, pi) => ({
        id: p.id,
        type: p.type,
        title: p.title || null,
        example: p.example || null,
        order_index: pi,
        questions: p.questions.map((q, qi) => ({
          id: q.id,
          question_title: q.question_title,
          question_image_url: q.question_image_url || null,
          explanation: q.explanation || null,
          order_index: qi,
          options:
            p.type === "input"
              ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: true, gap_index: o.gap_index ?? 0 })) ?? [])
              : p.type === "select_gaps"
                ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: o.is_correct, gap_index: o.gap_index ?? 0 })) ?? [])
                : q.options.map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })),
        })),
      })),
      theoryBlocks: theoryBlocks.map((b, i) => ({ ...b, order_index: i })),
    });
    if (process.env.NODE_ENV === "development") {
      console.log("[EditQuiz] updateQuiz response:", res);
    }
    setResult(res);
  }

  function handleAddTheoryBlock(type: TheoryBlockType) {
    addTheoryBlock(type);
    setActiveTab("theory");
  }

  async function handleDeletePage(pageIndex: number) {
    const page = form.getValues(`pages.${pageIndex}`);
    if (page?.id) {
      const res = await deleteQuizPage(page.id);
      if (!res.ok) {
        setResult(res);
        return;
      }
    }
    pagesArray.remove(pageIndex);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Edit quiz</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quiz/${quiz.slug}`} target="_blank" rel="noopener noreferrer">
              View quiz
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">Back to admin</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={cn(
                "cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "details"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Details and pages
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("theory")}
              className={cn(
                "cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "theory"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Theory
            </button>
          </div>
          <CardTitle className="pt-2">
            {activeTab === "details" ? "Quiz details" : "Theory"}
          </CardTitle>
          <CardDescription>
            {activeTab === "details"
              ? "Change title, description and pages. Each page has one question type."
              : "Text and image blocks shown before taking the quiz."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {activeTab === "details" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz title</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="e.g. Present Simple"
                    className={cn(form.formState.errors.title && "border-destructive")}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">General task / instructions</Label>
                  <Input
                    id="description"
                    {...form.register("description")}
                    placeholder="What respondents need to do (shown at the start of the quiz)"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Pages</Label>
                    <span className="text-sm text-muted-foreground">Pages: {pagesArray.fields.length}</span>
                  </div>
                  <QuizAiGenerationBlock
                    topic={ai.topic}
                    level={ai.level}
                    language={ai.language}
                    questionsPerPage={String(ai.questionsPerPage)}
                    selectedType={ai.selectedType as TestType}
                    customTask={ai.customTask}
                    style={ai.style}
                    constraints={ai.constraints}
                    lexicon={ai.lexicon}
                    bannedTopics={ai.bannedTopics}
                    onTopicChange={ai.setTopic}
                    onLevelChange={ai.setLevel}
                    onLanguageChange={ai.setLanguage}
                    onQuestionsPerPageChange={(value) => ai.setQuestionsPerPage(Number.isFinite(value) ? value : 1)}
                    onSelectedTypeChange={ai.setSelectedType}
                    onCustomTaskChange={ai.setCustomTask}
                    onStyleChange={ai.setStyle}
                    onConstraintsChange={ai.setConstraints}
                    onLexiconChange={ai.setLexicon}
                    onBannedTopicsChange={ai.setBannedTopics}
                    isGenerating={ai.isGenerating}
                    onGenerate={handleGenerate}
                    generatedSummary={
                      generatedDraft
                        ? `Готово: страниц ${generatedDraft.pages.length}, вопросов всего ${generatedDraft.pages.reduce(
                          (acc, p) => acc + (p.questions?.length ?? 0),
                          0
                        )}.` +
                        (generatedDraft.theoryBlocks?.length
                          ? ` Теория: ${generatedDraft.theoryBlocks.length} блок(ов).`
                          : "")
                        : null
                    }
                    errorMessage={ai.errorMessage}
                  />
                  {pagesArray.fields.map((field, pIndex) => (
                    <div
                      key={field.id}
                      ref={(el) => { pageRefs.current[pIndex] = el; }}
                    >
                      <PageBlock
                        form={form as unknown as UseFormReturn<PageBlockFormValues>}
                        pageIndex={pIndex}
                        defaultOption={() => defaultOption()}
                        defaultQuestion={defaultQuestionForBlock}
                        quizId={quiz.id}
                        onRemove={() => handleDeletePage(pIndex)}
                        canRemove={pagesArray.fields.length > 1}
                        onMoveUp={() => {
                          pagesArray.move(pIndex, pIndex - 1);
                          setTimeout(() => pageRefs.current[pIndex - 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                        }}
                        onMoveDown={() => {
                          pagesArray.move(pIndex, pIndex + 1);
                          setTimeout(() => pageRefs.current[pIndex + 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                        }}
                        canMoveUp={pIndex > 0}
                        canMoveDown={pIndex < pagesArray.fields.length - 1}
                        onConfirmDeleteQuestion={async (pi, qIndex) => {
                          const q = form.getValues(`pages.${pi}.questions.${qIndex}`);
                          if (q?.id) {
                            const r = await deleteQuestion(q.id);
                            if (!r.ok) {
                              setResult(r);
                              return false;
                            }
                          }
                          return true;
                        }}
                        onConfirmDeleteOption={async (pi, qIndex, oIndex) => {
                          const opts = form.getValues(`pages.${pi}.questions.${qIndex}.options`);
                          const opt = opts[oIndex];
                          if (opt?.id) {
                            const r = await deleteOption(opt.id);
                            if (!r.ok) {
                              setResult(r);
                              return false;
                            }
                          }
                          return true;
                        }}
                        onConfirmRemoveQuestionImage={async (pi, qIndex) => {
                          const q = form.getValues(`pages.${pi}.questions.${qIndex}`);
                          if (q?.id) {
                            const r = await deleteQuestionImage(q.id);
                            if (!r.ok) {
                              setResult(r);
                              return false;
                            }
                          }
                          return true;
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pagesArray.append(defaultPage(undefined, pagesArray.fields.length))}
                  >
                    <Plus className="size-4" /> Add page
                  </Button>
                </div>
              </>
            )}

            {activeTab === "theory" && (
              <QuizTheoryBlocksEditor
                blocks={theoryBlocks}
                uploadingImageIndex={uploadingImageIndex}
                uploadError={uploadError}
                onAddBlock={handleAddTheoryBlock}
                onRemoveBlock={(index) => {
                  void handleDeleteTheoryBlock(index);
                }}
                onMoveBlock={moveTheoryBlock}
                onUpdateBlock={updateTheoryBlock}
                onUploadImage={handleTheoryImageUpload}
              />
            )}

            {result && (
              <Alert variant={result.ok ? "default" : "destructive"}>
                <AlertDescription>
                  {result.ok ? "Quiz updated successfully." : result.error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
