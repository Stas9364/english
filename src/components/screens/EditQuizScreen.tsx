"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { TheoryImage } from "@/components/theory-image";
import {
  updateQuiz,
  uploadTheoryImage,
  deleteTheoryBlock,
  deleteQuizPage,
  deleteQuestion,
  deleteOption,
} from "@/app/admin/actions";
import type { QuizWithPages, TestType, TheoryBlock, TheoryBlockType } from "@/lib/supabase";
import type { TheoryBlockInput } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { Plus, Trash2, ChevronDown, ChevronUp, FileText, ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const optionSchema = z.object({
  id: z.string().uuid().optional(),
  option_text: z.string(),
  is_correct: z.boolean(),
  gap_index: z.number().optional(),
});

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  question_title: z.string().min(1, "Required"),
  explanation: z.string(),
  order_index: z.number(),
  options: z.array(optionSchema),
});

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["single", "multiple", "input", "select_gaps"]),
  title: z.string().optional(),
  order_index: z.number(),
  questions: z.array(questionSchema).min(1, "At least one question"),
}).superRefine((p, ctx) => {
  if (p.type === "input") {
    for (let i = 0; i < p.questions.length; i++) {
      const q = p.questions[i];
      const gapCount = Math.max(1, Math.max(0, (q.question_title || "").split("[[]]").length - 1));
      const missingGaps: number[] = [];
      for (let g = 0; g < gapCount; g++) {
        const hasAnswer = (q.options ?? []).some((o) => (o.gap_index ?? 0) === g && (o.option_text ?? "").trim());
        if (!hasAnswer) missingGaps.push(g + 1);
      }
      if (missingGaps.length > 0) {
        const message =
          gapCount > 1
            ? `Add at least one correct answer for gap${missingGaps.length > 1 ? "s" : ""} ${missingGaps.join(", ")}`
            : "Add at least one correct answer";
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["questions", i, "root"],
        });
      }
    }
  } else if (p.type === "select_gaps") {
    for (let i = 0; i < p.questions.length; i++) {
      const q = p.questions[i];
      const gapCount = Math.max(1, Math.max(0, (q.question_title || "").split("[[]]").length - 1));
      const missingGaps: number[] = [];
      const missingCorrect: number[] = [];
      for (let g = 0; g < gapCount; g++) {
        const optsAtGap = (q.options ?? []).filter((o) => (o.gap_index ?? 0) === g && (o.option_text ?? "").trim());
        if (optsAtGap.length === 0) missingGaps.push(g + 1);
        else if (!optsAtGap.some((o) => o.is_correct)) missingCorrect.push(g + 1);
      }
      if (missingGaps.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            gapCount > 1
              ? `Add at least one option for gap${missingGaps.length > 1 ? "s" : ""} ${missingGaps.join(", ")}`
              : "Add at least one option",
          path: ["questions", i, "root"],
        });
      }
      if (missingCorrect.length > 0 && missingGaps.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            gapCount > 1
              ? `Mark at least one correct option for gap${missingCorrect.length > 1 ? "s" : ""} ${missingCorrect.join(", ")}`
              : "Mark at least one correct option",
          path: ["questions", i, "root"],
        });
      }
    }
  } else {
    for (const q of p.questions) {
      if (q.options.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one option", path: ["questions"] });
        break;
      }
    }
  }
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9_-]+$/i, "Slug: letters, numbers, - and _ only"),
  pages: z.array(pageSchema).min(1, "Add at least one page"),
});

type FormValues = z.infer<typeof formSchema>;

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
  explanation?: string | null;
  options: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }[];
}, orderIndex?: number) {
  return {
    id: q?.id,
    question_title: q?.question_title ?? "",
    explanation: q?.explanation ?? "",
    order_index: orderIndex ?? 0,
    options: (q?.options?.length ? q.options : [{ option_text: "", is_correct: true, gap_index: 0 }]).map((o) =>
      defaultOption({ id: o.id, option_text: o.option_text, is_correct: o.is_correct ?? true, gap_index: o.gap_index }, o.gap_index)
    ),
  };
}

function defaultPage(p?: { id?: string; type: TestType; title?: string | null; questions: { id?: string; question_title: string; explanation?: string | null; options: { id?: string; option_text: string; is_correct: boolean }[] }[] }, pageIndex?: number) {
  const type = p?.type ?? "single";
  return {
    id: p?.id,
    type,
    title: p?.title ?? "",
    order_index: pageIndex ?? 0,
    questions: (p?.questions?.length ? p.questions : [{ question_title: "", explanation: "", options: [defaultOption()] }]).map((q, i) =>
      defaultQuestion(q, i)
    ),
  };
}

type TabId = "details" | "theory";

interface EditQuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
}

function toTheoryBlockInput(b: TheoryBlock): TheoryBlockInput {
  return { id: b.id, type: b.type, content: b.content, order_index: b.order_index };
}

export function EditQuizScreen({ quiz, theoryBlocks: initialTheoryBlocks = [] }: EditQuizScreenProps) {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [theoryBlocks, setTheoryBlocks] = useState<TheoryBlockInput[]>(
    () => initialTheoryBlocks.map(toTheoryBlockInput)
  );
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetIndexRef = useRef<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: quiz.title,
      description: quiz.description ?? "",
      slug: quiz.slug,
      pages: quiz.pages?.length
        ? quiz.pages.map((p, i) => defaultPage({ id: p.id, type: p.type, title: p.title, questions: p.questions }, i))
        : [defaultPage(undefined, 0)],
    },
  });

  const pagesArray = useFieldArray({
    control: form.control,
    name: "pages",
  });

  async function onSubmit(data: FormValues) {
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
        order_index: pi,
        questions: p.questions.map((q, qi) => ({
          id: q.id,
          question_title: q.question_title,
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
    setResult(res);
  }

  function addTheoryBlock(type: TheoryBlockType) {
    setTheoryBlocks((prev) => [...prev, { type, content: type === "image" ? "" : "", order_index: prev.length }]);
    setActiveTab("theory");
  }

  function removeTheoryBlock(index: number) {
    setTheoryBlocks((prev) => prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order_index: i })));
  }

  async function handleDeleteTheoryBlock(index: number) {
    const block = theoryBlocks[index];
    if (block?.id) {
      const res = await deleteTheoryBlock(block.id);
      if (!res.ok) {
        setResult(res);
        return;
      }
    }
    removeTheoryBlock(index);
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

  function moveTheoryBlock(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= theoryBlocks.length) return;
    setTheoryBlocks((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr.map((b, i) => ({ ...b, order_index: i }));
    });
  }

  function updateTheoryBlock(index: number, patch: Partial<TheoryBlockInput>) {
    setTheoryBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  async function handleTheoryImageUpload(index: number, file: File) {
    setUploadError(null);
    setUploadingImageIndex(index);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("quizId", quiz.id);
    const result = await uploadTheoryImage(formData);
    setUploadingImageIndex(null);
    if (result.ok) {
      updateTheoryBlock(index, { content: result.url });
    } else {
      setUploadError(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
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
              {pagesArray.fields.map((field, pIndex) => (
                <EditPageBlock
                  key={field.id}
                  form={form}
                  pageIndex={pIndex}
                  defaultOption={defaultOption}
                  defaultQuestion={defaultQuestion}
                  onRemove={() => handleDeletePage(pIndex)}
                  canRemove={pagesArray.fields.length > 1}
                  onConfirmDeleteQuestion={async (pIndex, qIndex) => {
                    const q = form.getValues(`pages.${pIndex}.questions.${qIndex}`);
                    if (q?.id) {
                      const r = await deleteQuestion(q.id);
                      if (!r.ok) {
                        setResult(r);
                        return false;
                      }
                    }
                    return true;
                  }}
                  onConfirmDeleteOption={async (pIndex, qIndex, oIndex) => {
                    const opts = form.getValues(`pages.${pIndex}.questions.${qIndex}.options`);
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
                />
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
              <div className="space-y-4">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const idx = uploadTargetIndexRef.current;
                    const f = e.target.files?.[0];
                    if (idx != null && f) {
                      handleTheoryImageUpload(idx, f);
                      uploadTargetIndexRef.current = null;
                    }
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => addTheoryBlock("text")}>
                    <FileText className="size-4" /> Text
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addTheoryBlock("image")}>
                    <ImageIcon className="size-4" /> Image
                  </Button>
                </div>
                <div className="space-y-3">
                  {theoryBlocks.map((block, index) => (
                    <Card key={block.id ?? `new-${index}`} className="border-muted">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {block.type === "text" ? "Text" : "Image"} {index + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => moveTheoryBlock(index, -1)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => moveTheoryBlock(index, 1)}
                              disabled={index === theoryBlocks.length - 1}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <ConfirmDeletePopover title="Delete block?" onConfirm={() => handleDeleteTheoryBlock(index)}>
                              <Button type="button" variant="ghost" size="icon-sm">
                                <Trash2 className="size-4" />
                              </Button>
                            </ConfirmDeletePopover>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {block.type === "text" ? (
                          <>
                            <Label className="text-xs">Text (markup supported)</Label>
                            <textarea
                              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={block.content}
                              onChange={(e) => updateTheoryBlock(index, { content: e.target.value })}
                              placeholder="Enter theory text…"
                            />
                          </>
                        ) : (
                          <>
                            <Label className="text-xs">Image URL</Label>
                            <div className="flex gap-2">
                              <Input
                                value={block.content}
                                onChange={(e) => updateTheoryBlock(index, { content: e.target.value })}
                                placeholder="Upload or paste URL"
                                className="min-w-0"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingImageIndex !== null}
                                onClick={() => {
                                  uploadTargetIndexRef.current = index;
                                  imageInputRef.current?.click();
                                }}
                              >
                                {uploadingImageIndex === index ? (
                                  "Uploading…"
                                ) : (
                                  <>
                                    <Upload className="size-4" /> Upload
                                  </>
                                )}
                              </Button>
                            </div>
                            {uploadError && uploadingImageIndex === null && (
                              <p className="text-sm text-destructive">{uploadError}</p>
                            )}
                            {block.content && (
                              <TheoryImage src={block.content} />
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {theoryBlocks.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add "Text" or "Image" blocks.</p>
                )}
              </div>
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

function EditPageBlock({
  form,
  pageIndex,
  defaultOption,
  defaultQuestion,
  onRemove,
  canRemove,
  onConfirmDeleteQuestion,
  onConfirmDeleteOption,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  pageIndex: number;
  defaultOption: (o?: { id?: string; option_text: string; is_correct: boolean }) => FormValues["pages"][0]["questions"][0]["options"][0];
  defaultQuestion: (q?: any, orderIndex?: number) => FormValues["pages"][0]["questions"][0];
  onRemove: () => void;
  canRemove: boolean;
  onConfirmDeleteQuestion?: (pageIndex: number, qIndex: number) => Promise<boolean>;
  onConfirmDeleteOption?: (pageIndex: number, qIndex: number, oIndex: number) => Promise<boolean>;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const pageType = form.watch(`pages.${pageIndex}.type`);
  const questionsArray = useFieldArray({
    control: form.control,
    name: `pages.${pageIndex}.questions`,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={isExpanded}
          >
            <span className="shrink-0">{isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
            <CardTitle className="text-base">Page {pageIndex + 1}</CardTitle>
          </button>
          <ConfirmDeletePopover
            title="Delete page?"
            onConfirm={onRemove}
            disabled={!canRemove}
          >
            <Button type="button" variant="ghost" size="icon-sm">
              <Trash2 className="size-4" />
            </Button>
          </ConfirmDeletePopover>
        </div>
      </CardHeader>
      {isExpanded && (
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Page type</Label>
          <select
            className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:[color-scheme:dark]"
            value={form.watch(`pages.${pageIndex}.type`)}
            onChange={(e) => {
              const value = e.target.value as TestType;
              form.setValue(`pages.${pageIndex}.type`, value);
              const questions = form.getValues(`pages.${pageIndex}.questions`);
              if (value === "input") {
                form.setValue(
                  `pages.${pageIndex}.questions`,
                  questions.map((q, i) => ({
                    ...q,
                    order_index: i,
                    options: [{ option_text: "", is_correct: true, gap_index: 0 }],
                  }))
                );
              } else if (value === "select_gaps") {
                form.setValue(
                  `pages.${pageIndex}.questions`,
                  questions.map((q, i) => ({
                    ...q,
                    order_index: i,
                    options: [{ option_text: "", is_correct: true, gap_index: 0 }],
                  }))
                );
              } else {
                form.setValue(
                  `pages.${pageIndex}.questions`,
                  questions.map((q, i) => ({
                    ...q,
                    order_index: i,
                    options: q.options?.length ? q.options : [defaultOption()],
                  }))
                );
              }
            }}
          >
            <option value="single">Single choice</option>
            <option value="multiple">Multiple choice</option>
            <option value="input">Text input</option>
            <option value="select_gaps">Dropdown in gaps</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Page title (optional)</Label>
          <Input
            {...form.register(`pages.${pageIndex}.title`)}
            placeholder="e.g. Choose the right form"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label>Questions</Label>
            <span className="text-sm text-muted-foreground">Questions: {questionsArray.fields.length}</span>
          </div>
          {questionsArray.fields.map((qField, qIndex) => (
            <Card key={qField.id} className="border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Question {qIndex + 1}</CardTitle>
                  <ConfirmDeletePopover
                    title="Delete question?"
                    onConfirm={async () => {
                      const ok = await onConfirmDeleteQuestion?.(pageIndex, qIndex);
                      if (ok) questionsArray.remove(qIndex);
                    }}
                    disabled={questionsArray.fields.length <= 1}
                  >
                    <Button type="button" variant="ghost" size="icon-sm">
                      <Trash2 className="size-4" />
                    </Button>
                  </ConfirmDeletePopover>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{(pageType === "input" || pageType === "select_gaps") ? "Sentence (use [[]] for the gap)" : "Question text"}</Label>
                  <Input
                    {...form.register(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
                    placeholder={(pageType === "input" || pageType === "select_gaps") ? "Use [[]] where the user should type or choose" : "Enter the question"}
                    className={cn(
                      form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title && "border-destructive"
                    )}
                  />
                  {form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Explanation (optional)</Label>
                  <Input
                    {...form.register(`pages.${pageIndex}.questions.${qIndex}.explanation`)}
                    placeholder="Shown after answer"
                  />
                </div>

                {(pageType === "single" || pageType === "multiple") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Options</Label>
                      <span className="text-sm text-muted-foreground">
                        Options: {form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).length}
                      </span>
                    </div>
                    {form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).map((_, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <Input
                          {...form.register(`pages.${pageIndex}.questions.${qIndex}.options.${oIndex}.option_text`)}
                          placeholder={`Option ${oIndex + 1}`}
                        />
                        <label className="flex cursor-pointer shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                          <Checkbox
                            checked={form.watch(`pages.${pageIndex}.questions.${qIndex}.options.${oIndex}.is_correct`)}
                            onCheckedChange={(checked) => {
                              if (pageType === "single" && checked === true) {
                                const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                                form.setValue(
                                  `pages.${pageIndex}.questions.${qIndex}.options`,
                                  opts.map((o, i) => ({ ...o, is_correct: i === oIndex }))
                                );
                              } else {
                                form.setValue(
                                  `pages.${pageIndex}.questions.${qIndex}.options.${oIndex}.is_correct`,
                                  checked === true
                                );
                              }
                            }}
                          />
                          Correct
                        </label>
                        <ConfirmDeletePopover
                          title="Delete option?"
                          onConfirm={async () => {
                            const ok = await onConfirmDeleteOption?.(pageIndex, qIndex, oIndex);
                            if (ok) {
                              const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                              if (opts.length > 1) {
                                form.setValue(
                                  `pages.${pageIndex}.questions.${qIndex}.options`,
                                  opts.filter((_, i) => i !== oIndex)
                                );
                              }
                            }
                          }}
                          disabled={form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).length <= 1}
                        >
                          <Button type="button" variant="ghost" size="icon">
                            <Trash2 className="size-4" />
                          </Button>
                        </ConfirmDeletePopover>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                        form.setValue(`pages.${pageIndex}.questions.${qIndex}.options`, [...opts, defaultOption()]);
                      }}
                    >
                      <Plus className="size-4" /> Add option
                    </Button>
                  </div>
                )}

                {pageType === "input" && (() => {
                    const title = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`) || "";
                    const gapCount = Math.max(1, Math.max(0, title.split("[[]]").length - 1));
                    const options = form.watch(`pages.${pageIndex}.questions.${qIndex}.options`) ?? [];
                    const questionError = form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.root?.message
                      ?? form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.message;
                    const questionErrorMessage = typeof questionError === "string" ? questionError : (questionError as unknown as { message?: string })?.message;
                    return (
                      <div className="space-y-4">
                        {questionErrorMessage && (
                          <Alert variant="destructive">
                            <AlertDescription>{questionErrorMessage}</AlertDescription>
                          </Alert>
                        )}
                        {Array.from({ length: gapCount }, (_, gapIndex) => {
                          const indices = options.map((o, i) => ({ o, i })).filter(({ o }) => (o.gap_index ?? 0) === gapIndex).map(({ i }) => i);
                          return (
                            <div key={gapIndex} className="space-y-2">
                              <Label>
                                {gapCount > 1 ? `Correct answers for gap ${gapIndex + 1}` : "Correct answers (any match counts)"}
                              </Label>
                              {indices.map((optIdx) => (
                                <div key={optIdx} className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      {...form.register(`pages.${pageIndex}.questions.${qIndex}.options.${optIdx}.option_text`)}
                                      placeholder="Acceptable answer"
                                      className={cn(
                                        form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[optIdx]?.option_text && "border-destructive"
                                      )}
                                    />
                                    <ConfirmDeletePopover
                                      title="Delete correct answer?"
                                      onConfirm={async () => {
                                        const ok = await onConfirmDeleteOption?.(pageIndex, qIndex, optIdx);
                                        if (ok) {
                                          const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                                          if (opts.length > 1) {
                                            form.setValue(
                                              `pages.${pageIndex}.questions.${qIndex}.options`,
                                              opts.filter((_, i) => i !== optIdx)
                                            );
                                          }
                                        }
                                      }}
                                      disabled={indices.length <= 1}
                                    >
                                      <Button type="button" variant="ghost" size="icon">
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </ConfirmDeletePopover>
                                  </div>
                                  {form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[optIdx]?.option_text && (
                                    <p className="text-sm text-destructive">
                                      {form.formState.errors.pages[pageIndex].questions[qIndex].options[optIdx].option_text.message}
                                    </p>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                                  form.setValue(`pages.${pageIndex}.questions.${qIndex}.options`, [
                                    ...opts,
                                    { option_text: "", is_correct: true, gap_index: gapIndex },
                                  ]);
                                }}
                              >
                                <Plus className="size-4" /> Add correct answer{gapCount > 1 ? ` for gap ${gapIndex + 1}` : ""}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                {pageType === "select_gaps" && (() => {
                    const title = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`) || "";
                    const gapCount = Math.max(1, Math.max(0, title.split("[[]]").length - 1));
                    const options = form.watch(`pages.${pageIndex}.questions.${qIndex}.options`) ?? [];
                    const questionError = form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.root?.message
                      ?? form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.message;
                    const questionErrorMessage = typeof questionError === "string" ? questionError : (questionError as unknown as { message?: string })?.message;
                    return (
                      <div className="space-y-4">
                        {questionErrorMessage && (
                          <Alert variant="destructive">
                            <AlertDescription>{questionErrorMessage}</AlertDescription>
                          </Alert>
                        )}
                        {Array.from({ length: gapCount }, (_, gapIndex) => {
                          const indices = options.map((o, i) => ({ o, i })).filter(({ o }) => (o.gap_index ?? 0) === gapIndex).map(({ i }) => i);
                          return (
                            <div key={gapIndex} className="space-y-2">
                              <Label>
                                {gapCount > 1 ? `Options for gap ${gapIndex + 1}` : "Options (mark correct)"}
                              </Label>
                              {indices.map((optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <Input
                                    {...form.register(`pages.${pageIndex}.questions.${qIndex}.options.${optIdx}.option_text`)}
                                    placeholder="Option text"
                                    className={cn(
                                      form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[optIdx]?.option_text && "border-destructive"
                                    )}
                                  />
                                  <label className="flex cursor-pointer shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                                    <Checkbox
                                      checked={form.watch(`pages.${pageIndex}.questions.${qIndex}.options.${optIdx}.is_correct`)}
                                      onCheckedChange={(checked) =>
                                        form.setValue(`pages.${pageIndex}.questions.${qIndex}.options.${optIdx}.is_correct`, checked === true)
                                      }
                                    />
                                    Correct
                                  </label>
                                  <ConfirmDeletePopover
                                    title="Delete option?"
                                    onConfirm={async () => {
                                      const ok = await onConfirmDeleteOption?.(pageIndex, qIndex, optIdx);
                                      if (ok) {
                                        const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                                        form.setValue(
                                          `pages.${pageIndex}.questions.${qIndex}.options`,
                                          opts.filter((_, i) => i !== optIdx)
                                        );
                                      }
                                    }}
                                    disabled={indices.length <= 1}
                                  >
                                    <Button type="button" variant="ghost" size="icon">
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </ConfirmDeletePopover>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                                  form.setValue(`pages.${pageIndex}.questions.${qIndex}.options`, [
                                    ...opts,
                                    { option_text: "", is_correct: false, gap_index: gapIndex },
                                  ]);
                                }}
                              >
                                <Plus className="size-4" /> Add option{gapCount > 1 ? ` for gap ${gapIndex + 1}` : ""}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => questionsArray.append(defaultQuestion(undefined, questionsArray.fields.length))}
            >
              <Plus className="size-4" /> Add question
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              Collapse
            </Button>
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}
