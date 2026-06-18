"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EditQuizHeaderProps {
  quizSlug: string;
  backToTopicHref: string;
}

export function EditQuizHeader({ quizSlug, backToTopicHref }: EditQuizHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold">Edit quiz</h2>
      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/quiz/${quizSlug}`}>
            View quiz
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={backToTopicHref}>Back to quizzes</Link>
        </Button>
      </div>
    </div>
  );
}
