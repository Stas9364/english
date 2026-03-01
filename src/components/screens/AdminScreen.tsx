"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createQuiz, uploadTheoryImage } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import Link from "next/link";
import { TheoryImage } from "@/components/theory-image";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, FileText, ImageIcon, Upload } from "lucide-react";
import type { Quiz } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { TestType, TheoryBlockType } from "@/lib/supabase";
import type { TheoryBlockInput } from "@/app/admin/actions";

const optionSchema = z.object({
  option_text: z.string().min(1, "Required"),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  question_title: z.string().min(1, "Required"),
  explanation: z.string(),
  order_index: z.number(),
  options: z.array(optionSchema),
});

const pageSchema = z.object({
  type: z.enum(["single", "multiple", "input"]),
  title: z.string().optional(),
  order_index: z.number(),
  questions: z.array(questionSchema).min(1, "At least one question"),
}).superRefine((p, ctx) => {
  if (p.type === "input") {
    for (let i = 0; i < p.questions.length; i++) {
      const q = p.questions[i];
      const opts = q.options?.filter((o) => o.option_text?.trim()) ?? [];
      if (opts.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one correct answer", path: ["questions", i] });
        continue;
      }
      const gapCount = Math.max(0, (q.question_title || "").split("[[]]").length - 1);
      if (gapCount > 1) {
        for (let oi = 0; oi < opts.length; oi++) {
          const parts = opts[oi].option_text.split(";").map((s) => s.trim()).filter(Boolean);
          if (parts.length !== gapCount) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `With ${gapCount} gaps use semicolons: answer1; answer2 (got ${parts.length} part(s))`,
              path: ["questions", i, "options", oi, "option_text"],
            });
          }
        }
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
  pages: z.array(pageSchema).min(1, "Add at least one page"),
});

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

type FormValues = z.infer<typeof formSchema>;

const defaultOption = () => ({ option_text: "", is_correct: false });
function defaultQuestion(orderIndex: number) {
  return {
    question_title: "",
    explanation: "",
    order_index: orderIndex,
    options: [defaultOption()],
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

interface AdminScreenProps {
  quizzes: Quiz[];
}

type CreateTheoryBlock = Omit<TheoryBlockInput, "id">;

export function AdminScreen({ quizzes }: AdminScreenProps) {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [theoryBlocks, setTheoryBlocks] = useState<CreateTheoryBlock[]>([]);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetIndexRef = useRef<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
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

  async function onSubmit(data: FormValues) {
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
          options: p.type === "input" ? (q.options?.filter((o) => o.option_text?.trim()).map((o) => ({ option_text: o.option_text.trim(), is_correct: true })) ?? []) : q.options,
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
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Your quizzes</CardTitle>
          <CardDescription>
            All quizzes. Click the pencil icon to edit, or View to open the quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No quizzes yet. Create one below.</p>
          ) : (
            <ul className="space-y-2">
              {quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-muted-foreground text-sm truncate">{quiz.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/quiz/${quiz.slug}`} target="_blank" rel="noopener noreferrer">
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon-sm" asChild title="Edit quiz">
                      <Link href={`/admin/quiz/${quiz.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create quiz</CardTitle>
          <CardDescription>
            Add title, description (general task), then add one or more pages. Each page has one question type (single choice, multiple choice, or text input).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
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
                <PageFormBlock
                  key={field.id}
                  form={form}
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

            <div className="space-y-4">
              <Label>Theory (optional)</Label>
              <p className="text-sm text-muted-foreground">
                Text and image blocks shown before taking the quiz. You can add them after creating the quiz.
              </p>
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
                  <Card key={`tb-${index}`} className="border-muted">
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
                          <ConfirmDeletePopover title="Delete block?" onConfirm={() => removeTheoryBlock(index)}>
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
                          <Label className="text-xs">Text</Label>
                          <textarea
                            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                              {uploadingImageIndex === index ? "Uploading…" : <><Upload className="size-4" /> Upload</>}
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
            </div>

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

function PageFormBlock({
  form,
  pageIndex,
  defaultOption,
  defaultQuestion,
  onRemove,
  canRemove,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  pageIndex: number;
  defaultOption: () => { option_text: string; is_correct: boolean };
  defaultQuestion: (orderIndex: number) => FormValues["pages"][0]["questions"][0];
  onRemove: () => void;
  canRemove: boolean;
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
                    options: [{ option_text: "", is_correct: true }],
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
                    onConfirm={() => questionsArray.remove(qIndex)}
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
                  <Label>{pageType === "input" ? "Sentence (use [[]] for the gap)" : "Question text"}</Label>
                  <Input
                    {...form.register(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
                    placeholder={pageType === "input" ? "Use [[]] where the user should type" : "Enter the question"}
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
                          onConfirm={() => {
                            const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                            if (opts.length > 1) {
                              form.setValue(
                                `pages.${pageIndex}.questions.${qIndex}.options`,
                                opts.filter((_, i) => i !== oIndex)
                              );
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

                {pageType === "input" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Correct answers (any match counts)</Label>
                      <span className="text-sm text-muted-foreground">
                        Answers: {form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).length}
                      </span>
                    </div>
                    {(() => {
                      const title = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`) || "";
                      const gapCount = Math.max(0, title.split("[[]]").length - 1);
                      return gapCount > 1 ? (
                        <p className="text-sm text-muted-foreground">
                          One variant = all gaps separated by semicolon (e.g. answer1; answer2)
                        </p>
                      ) : null;
                    })()}
                    {form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).map((_, oIndex) => (
                      <div key={oIndex} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Input
                            {...form.register(`pages.${pageIndex}.questions.${qIndex}.options.${oIndex}.option_text`)}
                            placeholder={(() => {
                              const title = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`) || "";
                              const gapCount = Math.max(0, title.split("[[]]").length - 1);
                              return gapCount > 1 ? "answer1; answer2" : "Acceptable answer";
                            })()}
                            className={cn(
                              form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[oIndex]?.option_text && "border-destructive"
                            )}
                          />
                          <ConfirmDeletePopover
                            title="Delete correct answer?"
                            onConfirm={() => {
                              const opts = form.getValues(`pages.${pageIndex}.questions.${qIndex}.options`);
                              if (opts.length > 1) {
                                form.setValue(
                                  `pages.${pageIndex}.questions.${qIndex}.options`,
                                  opts.filter((_, i) => i !== oIndex)
                                );
                              }
                            }}
                            disabled={form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).length <= 1}
                          >
                            <Button type="button" variant="ghost" size="icon">
                              <Trash2 className="size-4" />
                            </Button>
                          </ConfirmDeletePopover>
                        </div>
                        {form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[oIndex]?.option_text && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.pages[pageIndex].questions[qIndex].options[oIndex].option_text.message}
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
                        form.setValue(`pages.${pageIndex}.questions.${qIndex}.options`, [...opts, { option_text: "", is_correct: true }]);
                      }}
                    >
                      <Plus className="size-4" /> Add correct answer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => questionsArray.append(defaultQuestion(questionsArray.fields.length))}
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
