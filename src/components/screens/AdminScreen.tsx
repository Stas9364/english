"use client";

import { AdminQuizListCard } from "@/components/admin-quiz-list-card";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import type { Quiz } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AdminScreenProps {
  quizzes: Quiz[];
}

export function AdminScreen({ quizzes }: AdminScreenProps) {
  const router = useRouter();

  return (
    <PageContainer className="space-y-8">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/admin/create">Create quiz</Link>
        </Button>
      </div>
      <AdminQuizListCard
        quizzes={quizzes}
        onDeleteError={() => {}}
        onDeleteSuccess={() => router.refresh()}
      />
    </PageContainer>
  );
}
