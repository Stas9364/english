"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Quiz } from "@/lib/supabase";
import { deleteQuiz } from "@/app/admin/actions";

export interface AdminQuizListCardProps {
  quizzes: Quiz[];
  onDeleteError?: (result: { ok: false; error?: string }) => void;
  onDeleteSuccess?: () => void;
}

export function AdminQuizListCard({
  quizzes,
  onDeleteError,
  onDeleteSuccess,
}: AdminQuizListCardProps) {
  return (
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
                  <ConfirmDeletePopover
                    title="Delete this quiz? All pages, questions and theory will be removed."
                    onConfirm={async () => {
                      const res = await deleteQuiz(quiz.id);
                      if (!res.ok) {
                        onDeleteError?.(res);
                        return;
                      }
                      onDeleteSuccess?.();
                    }}
                  >
                    <Button type="button" variant="ghost" size="icon-sm" title="Delete quiz">
                      <Trash2 className="size-4" />
                    </Button>
                  </ConfirmDeletePopover>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
