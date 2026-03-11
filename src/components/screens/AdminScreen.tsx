"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQuiz, uploadTheoryImage } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Quiz } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { TestType, TheoryBlockType } from "@/lib/supabase";
import type { TheoryBlockInput } from "@/app/admin/actions";
import { QuizAiGenerationBlock } from "@/components/quiz-ai-generation-block";
import { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import { QuizTheoryBlocksEditor } from "@/components/quiz-theory-blocks-editor";
import { PageFormBlock } from "@/components/page-form-block";
import type { PageFormBlockFormValues } from "@/components/page-form-block";
import type { UseFormReturn } from "react-hook-form";
import { createQuizFormSchema, type CreateQuizFormValues } from "@/lib/quiz-page-schema";
import { AdminQuizListCard } from "@/components/admin-quiz-list-card";

function slugify(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "quiz";
}

const defaultOption = (gapIndex?: number) => ({ option_text: "", is_correct: false, gap_index: gapIndex ?? 0 });
function defaultQuestion(orderIndex: number, pageType?: TestType) {
  const options =
    pageType === "matching"
      ? [{ option_text: "", is_correct: true }]
      : [defaultOption()];
  return {
    question_title: "",
    explanation: "",
    order_index: orderIndex,
    options,
  };
}
function defaultPage(pageIndex: number) {
  return {
    type: "single" as TestType,
    title: "",
    order_index: pageIndex,
    questions: [defaultQuestion(0)],
  };
}

function isDefaultEmptyPage(page: CreateQuizFormValues["pages"][number] | undefined): boolean {
  if (!page) return false;
  if (page.type !== "single") return false;
  if ((page.title ?? "").trim() !== "") return false;
  if (!page.questions || page.questions.length !== 1) return false;
  const q = page.questions[0];
  if ((q.question_title ?? "").trim() !== "") return false;
  if ((q.explanation ?? "").trim() !== "") return false;
  if (!q.options || q.options.length !== 1) return false;
  const o = q.options[0];
  if ((o.option_text ?? "").trim() !== "") return false;
  return true;
}

interface AdminScreenProps {
  quizzes: Quiz[];
}

type CreateTheoryBlock = Omit<TheoryBlockInput, "id">;

export function AdminScreen({ quizzes }: AdminScreenProps) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [theoryBlocks, setTheoryBlocks] = useState<CreateTheoryBlock[]>([]);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "error"; message: string }
    | { state: "success"; message: string }
  >({ state: "idle" });
  const ai = useQuizAiGeneration();
  // Первая удачная генерация заменяет страницы, последующие — добавляют в конец.
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  const form = useForm<CreateQuizFormValues>({
    resolver: zodResolver(createQuizFormSchema),
    defaultValues: {
      title: "",
      description: "",
      pages: [defaultPage(0)],
    },
  });

  const pagesArray = useFieldArray({
    control: form.control,
    name: "pages",
  });

  function mapGeneratedPagesToForm(pages: { type: TestType; title?: string | null; questions: { question_title: string; explanation?: string | null; options: { option_text: string; is_correct: boolean; gap_index?: number }[] }[] }[]) {
    return pages.map((p, pi) => ({
      type: p.type,
      title: p.title ?? "",
      order_index: pi,
      questions: (p.questions ?? []).map((q, qi) => ({
        question_title: q.question_title ?? "",
        explanation: (q.explanation ?? "")?.toString?.() ?? "",
        order_index: qi,
        options: (q.options ?? []).map((o) => ({
          option_text: o.option_text ?? "",
          is_correct: !!o.is_correct,
          ...(typeof o.gap_index === "number" ? { gap_index: o.gap_index } : {}),
        })),
      })),
    })) satisfies CreateQuizFormValues["pages"];
  }

  async function handleGeneratePages() {
    setGenStatus({ state: "loading" });
    try {
      const res = await ai.generate();
      if (!res.ok) {
        setGenStatus({ state: "error", message: res.error });
        return;
      }

      const mapped = mapGeneratedPagesToForm(res.pages);
      const current = form.getValues("pages") ?? [];
      const shouldReplaceFirst =
        !hasGeneratedOnce && current.length === 1 && isDefaultEmptyPage(current[0] as CreateQuizFormValues["pages"][number]);

      if (shouldReplaceFirst) {
        // Первая генерация и форма ещё в дефолтном пустом состоянии — заменяем.
        pagesArray.replace(mapped);
      } else {
        // Если страница уже заполнена ИЛИ генерация не первая — всегда добавляем в конец.
        const appended = [
          ...current.map((p, i) => ({ ...p, order_index: i })),
          ...mapped.map((p, i) => ({ ...p, order_index: current.length + i })),
        ] as CreateQuizFormValues["pages"];
        pagesArray.replace(appended);
      }
      setHasGeneratedOnce(true);

      setGenStatus({
        state: "success",
        message: `Сгенерировано страниц: ${res.pages.length}. Проверьте/отредактируйте вопросы ниже перед сохранением квиза.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setGenStatus({ state: "error", message: msg });
    }
  }

  function addTheoryBlock(type: TheoryBlockType) {
    setTheoryBlocks((prev) => [...prev, { type, content: type === "image" ? "" : "", order_index: prev.length }]);
  }

  function removeTheoryBlock(index: number) {
    setTheoryBlocks((prev) => prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order_index: i })));
  }

  function moveTheoryBlock(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= theoryBlocks.length) return;
    setTheoryBlocks((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr.map((b, i) => ({ ...b, order_index: i }));
    });
  }

  function updateTheoryBlock(index: number, patch: Partial<CreateTheoryBlock>) {
    setTheoryBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  async function handleTheoryImageUpload(index: number, file: File) {
    setUploadError(null);
    setUploadingImageIndex(index);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadTheoryImage(formData);
    setUploadingImageIndex(null);
    if (result.ok) {
      updateTheoryBlock(index, { content: result.url });
    } else {
      setUploadError(result.error);
    }
  }

  async function onSubmit(data: CreateQuizFormValues) {
    setResult(null);
    const res = await createQuiz({
      title: data.title,
      description: data.description,
      slug: slugify(data.title),
      pages: data.pages.map((p, pi) => ({
        type: p.type,
        title: p.title || null,
        order_index: pi,
        questions: p.questions.map((q, qi) => ({
          question_title: q.question_title,
          explanation: q.explanation || null,
          order_index: qi,
          options:
          p.type === "input"
            ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ option_text: o.option_text.trim(), is_correct: true, gap_index: o.gap_index ?? 0 })) ?? [])
            : p.type === "select_gaps"
              ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ option_text: o.option_text.trim(), is_correct: o.is_correct, gap_index: o.gap_index ?? 0 })) ?? [])
              : q.options,
        })),
      })),
      theoryBlocks: theoryBlocks.map((b, i) => ({ type: b.type, content: b.content, order_index: i })),
    });
    setResult(res);
    if (res.ok) {
      form.reset({
        title: "",
        description: "",
        pages: [defaultPage(0)],
      });
      setTheoryBlocks([]);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <AdminQuizListCard
        quizzes={quizzes}
        onDeleteError={setResult}
        onDeleteSuccess={() => router.refresh()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Create quiz</CardTitle>
          <CardDescription>
            Add title, description (general task), then add one or more pages. Each page has one question type (single choice, multiple choice, text input, or dropdown in gaps).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

            <QuizAiGenerationBlock
              topic={ai.topic}
              level={ai.level}
              language={ai.language}
              questionsPerPage={String(ai.questionsPerPage)}
              selectedType={ai.selectedType as TestType}
              style={ai.style}
              constraints={ai.constraints}
              lexicon={ai.lexicon}
              bannedTopics={ai.bannedTopics}
              onTopicChange={ai.setTopic}
              onLevelChange={ai.setLevel}
              onLanguageChange={ai.setLanguage}
              onQuestionsPerPageChange={(value) => ai.setQuestionsPerPage(Number.isFinite(value) ? value : 1)}
              onSelectedTypeChange={ai.setSelectedType}
              onStyleChange={ai.setStyle}
              onConstraintsChange={ai.setConstraints}
              onLexiconChange={ai.setLexicon}
              onBannedTopicsChange={ai.setBannedTopics}
              generateLabel="Generate page"
              helperText="The first successful generation replaces the current pages; all subsequent generations append new pages to the end."
              isGenerating={ai.isGenerating}
              onGenerate={handleGeneratePages}
              generatedSummary={genStatus.state === "success" ? genStatus.message : null}
              errorMessage={ai.errorMessage ?? (genStatus.state === "error" ? genStatus.message : null)}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Pages</Label>
                <span className="text-sm text-muted-foreground">Pages: {pagesArray.fields.length}</span>
              </div>
              {pagesArray.fields.map((field, pIndex) => (
                <PageFormBlock
                  key={field.id}
                  form={form as unknown as UseFormReturn<PageFormBlockFormValues>}
                  pageIndex={pIndex}
                  defaultOption={defaultOption}
                  defaultQuestion={defaultQuestion}
                  onRemove={() => pagesArray.remove(pIndex)}
                  canRemove={pagesArray.fields.length > 1}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pagesArray.append(defaultPage(pagesArray.fields.length))}
              >
                <Plus className="size-4" /> Add page
              </Button>
            </div>

            <QuizTheoryBlocksEditor
              blocks={theoryBlocks}
              uploadingImageIndex={uploadingImageIndex}
              uploadError={uploadError}
              onAddBlock={(type) => addTheoryBlock(type)}
              onRemoveBlock={(index) => removeTheoryBlock(index)}
              onMoveBlock={(index, dir) => moveTheoryBlock(index, dir)}
              onUpdateBlock={(index, patch) => updateTheoryBlock(index, patch)}
              onUploadImage={handleTheoryImageUpload}
            />

            {result && (
              <Alert variant={result.ok ? "default" : "destructive"}>
                <AlertDescription>
                  {result.ok ? "Quiz created successfully." : result.error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Create quiz"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
