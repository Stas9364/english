"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createQuiz } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { Quiz } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const optionSchema = z.object({
  option_text: z.string().min(1, "Required"),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  question_text: z.string().min(1, "Required"),
  explanation: z.string(),
  options: z.array(optionSchema).min(1, "At least one option"),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  questions: z.array(questionSchema).min(1, "At least one question"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultOption = () => ({ option_text: "", is_correct: false });
const defaultQuestion = () => ({
  question_text: "",
  explanation: "",
  options: [defaultOption()],
});

interface AdminScreenProps {
  quizzes: Quiz[];
}

export function AdminScreen({ quizzes }: AdminScreenProps) {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      questions: [defaultQuestion()],
    },
  });

  const questionsArray = useFieldArray({
    control: form.control,
    name: "questions",
  });

  async function onSubmit(data: FormValues) {
    setResult(null);
    const res = await createQuiz(data);
    setResult(res);
    if (res.ok) {
      form.reset({
        title: "",
        description: "",
        questions: [defaultQuestion()],
      });
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Список тестов для будущего редактирования */}
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
                      <Link href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
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
            Add a title, description, and questions with options. Mark the correct option(s) for each question.
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
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                {...form.register("description")}
                placeholder="Short description of the quiz"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => questionsArray.append(defaultQuestion())}
                >
                  <Plus className="size-4" /> Add question
                </Button>
              </div>

              {questionsArray.fields.map((field, qIndex) => (
                <Card key={field.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => questionsArray.remove(qIndex)}
                        disabled={questionsArray.fields.length === 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question text</Label>
                      <Input
                        {...form.register(`questions.${qIndex}.question_text`)}
                        placeholder="Enter the question"
                        className={cn(
                          form.formState.errors.questions?.[qIndex]?.question_text && "border-destructive"
                        )}
                      />
                      {form.formState.errors.questions?.[qIndex]?.question_text && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.questions[qIndex]?.question_text?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation (optional)</Label>
                      <Input
                        {...form.register(`questions.${qIndex}.explanation`)}
                        placeholder="Shown after the user answers"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Options</Label>
                      {form.watch(`questions.${qIndex}.options`).map((_, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <Input
                            {...form.register(`questions.${qIndex}.options.${oIndex}.option_text`)}
                            placeholder={`Option ${oIndex + 1}`}
                            className={cn(
                              form.formState.errors.questions?.[qIndex]?.options?.[oIndex]?.option_text &&
                                "border-destructive"
                            )}
                          />
                          <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                            <Checkbox
                              checked={form.watch(`questions.${qIndex}.options.${oIndex}.is_correct`)}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  `questions.${qIndex}.options.${oIndex}.is_correct`,
                                  checked === true
                                )
                              }
                            />
                            Correct
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const opts = form.getValues(`questions.${qIndex}.options`);
                              if (opts.length > 1) {
                                const next = opts.filter((_, i) => i !== oIndex);
                                form.setValue(`questions.${qIndex}.options`, next);
                              }
                            }}
                            disabled={form.watch(`questions.${qIndex}.options`).length <= 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const opts = form.getValues(`questions.${qIndex}.options`);
                          form.setValue(`questions.${qIndex}.options`, [...opts, defaultOption()]);
                        }}
                      >
                        <Plus className="size-4" /> Add option
                      </Button>
                      {form.formState.errors.questions?.[qIndex]?.options && (
                        <p className="text-sm text-destructive">
                          {(form.formState.errors.questions[qIndex]?.options as { message?: string })?.message ??
                            "At least one option required"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {form.formState.errors.questions?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.questions.root.message}</p>
              )}
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
