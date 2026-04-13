"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminQuizListCard } from "@/components/admin-quiz-list-card";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import type { Quiz, Topic } from "@/lib/supabase";

interface AdminTopicQuizzesScreenProps {
  topic: Topic;
  quizzes: Quiz[];
}

export function AdminTopicQuizzesScreen({ topic, quizzes }: AdminTopicQuizzesScreenProps) {
  const router = useRouter();

  return (
    <PageContainer className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{topic.name}</h2>
          {topic.description && (
            <p className="text-sm text-muted-foreground">{topic.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/admin">Back to topics</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/create">Create quiz</Link>
          </Button>
        </div>
      </div>

      <AdminQuizListCard
        quizzes={quizzes}
        onDeleteError={() => {}}
        onDeleteSuccess={() => router.refresh()}
      />
    </PageContainer>
  );
}
