"use client";

import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CrosswordPlayer } from "@/components/crossword/crossword-player";
import type { CrosswordQuiz } from "@/lib/supabase";

export function CrosswordScreen({
  quiz,
  isAdmin = false,
  adminBackHref = "/admin",
}: {
  quiz: CrosswordQuiz;
  isAdmin?: boolean;
  adminBackHref?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="flex flex-col gap-6 sm:px-6">
        {isAdmin ? (
          <div>
            <Button asChild variant="ghost" size="sm">
              <Link href={adminBackHref}>Back to admin</Link>
            </Button>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
            {quiz.description ? <CardDescription>{quiz.description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <CrosswordPlayer quiz={quiz} />
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
