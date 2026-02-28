"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { updateQuiz } from "@/app/admin/actions";
import type { QuizWithPages, TestType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const optionSchema = z.object({
  id: z.string().uuid().optional(),
  option_text: z.string().min(1, "Required"),
  is_correct: z.boolean(),
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
  type: z.enum(["single", "multiple", "input"]),
  title: z.string().optional(),
  order_index: z.number(),
  questions: z.array(questionSchema).min(1, "At least one question"),
}).superRefine((p, ctx) => {
  if (p.type === "input") {
    for (let i = 0; i < p.questions.length; i++) {
      const opts = p.questions[i].options?.filter((o) => o.option_text?.trim()) ?? [];
      if (opts.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one correct answer", path: ["questions", i] });
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

function defaultOption(option?: { id?: string; option_text: string; is_correct: boolean }) {
  return {
    id: option?.id,
    option_text: option?.option_text ?? "",
    is_correct: option?.is_correct ?? false,
  };
}

function defaultQuestion(q?: {
  id?: string;
  question_title: string;
  explanation?: string | null;
  options: { id?: string; option_text: string; is_correct: boolean }[];
}, orderIndex?: number) {
  return {
    id: q?.id,
    question_title: q?.question_title ?? "",
    explanation: q?.explanation ?? "",
    order_index: orderIndex ?? 0,
    options: (q?.options?.length ? q.options : [{ option_text: "", is_correct: true }]).map((o) =>
      defaultOption({ id: o.id, option_text: o.option_text, is_correct: o.is_correct ?? true })
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

interface EditQuizScreenProps {
  quiz: QuizWithPages;
}

export function EditQuizScreen({ quiz }: EditQuizScreenProps) {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

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
              ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: true })) ?? [])
              : q.options.map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })),
        })),
      })),
    });
    setResult(res);
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
          <CardTitle>Quiz details</CardTitle>
          <CardDescription>
            Change title, description and pages. Each page has one question type.
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
                  onRemove={() => pagesArray.remove(pIndex)}
                  canRemove={pagesArray.fields.length > 1}
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
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  pageIndex: number;
  defaultOption: (o?: { id?: string; option_text: string; is_correct: boolean }) => FormValues["pages"][0]["questions"][0]["options"][0];
  defaultQuestion: (q?: any, orderIndex?: number) => FormValues["pages"][0]["questions"][0];
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
                  <Label>Question text</Label>
                  <Input
                    {...form.register(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
                    placeholder="Enter the question"
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
                    {form.watch(`pages.${pageIndex}.questions.${qIndex}.options`).map((_, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <Input
                          {...form.register(`pages.${pageIndex}.questions.${qIndex}.options.${oIndex}.option_text`)}
                          placeholder="Acceptable answer"
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
