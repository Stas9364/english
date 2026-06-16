import { notFound } from "next/navigation";
import {
  getIsAdmin,
} from "@/lib/supabase";
import { CrosswordScreen } from "@/components/screens/CrosswordScreen";
import { QuizScreen } from "@/components/screens/QuizScreen";
import type { Metadata } from 'next';
import { getQuizPageDataBySlug } from "@/lib/quiz-page-cache";

interface QuizPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugDecoded = decodeURIComponent(slug).trim();
  if (!slugDecoded) notFound();

  return {
    title: `${slugDecoded}`,
  };
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { slug } = await params;
  const slugDecoded = decodeURIComponent(slug).trim();
  if (!slugDecoded) notFound();

  const [{ quiz, theoryBlocks, topicRow, crosswordQuiz }, isAdmin] = await Promise.all([
    getQuizPageDataBySlug(slugDecoded),
    getIsAdmin(),
  ]);

  if (!quiz) notFound();

  const adminBackHref =
    topicRow
      ? `/admin/${topicRow.chapter}/${topicRow.slug}`
      : "/admin";

  if (topicRow?.chapter.trim().toLowerCase() === "crossword") {
    if (!crosswordQuiz) notFound();
    return (
      <CrosswordScreen
        quiz={crosswordQuiz}
        isAdmin={isAdmin}
        adminBackHref={adminBackHref}
      />
    );
  }

  return (
    <QuizScreen
      quiz={quiz}
      theoryBlocks={theoryBlocks}
      isAdmin={isAdmin}
      adminBackHref={adminBackHref}
    />
  );
}
