import { notFound } from "next/navigation";
import {
  createServerClient,
  getCrosswordQuizBySlug,
  getQuizWithPagesBySlug,
  getTheoryBlocks,
  getIsAdmin,
  getTopicMetaById,
} from "@/lib/supabase";
import { CrosswordScreen } from "@/components/screens/CrosswordScreen";
import { QuizScreen } from "@/components/screens/QuizScreen";
import type { Metadata } from 'next';

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

  const supabase = await createServerClient();
  const [quiz, isAdmin] = await Promise.all([
    getQuizWithPagesBySlug(supabase, slugDecoded),
    getIsAdmin(),
  ]);

  if (!quiz) notFound();

  const [theoryBlocks, topicRow] = await Promise.all([
    getTheoryBlocks(supabase, quiz.id),
    getTopicMetaById(supabase, quiz.topic_id),
  ]);

  const adminBackHref =
    topicRow
      ? `/admin/${topicRow.chapter}/${topicRow.slug}`
      : "/admin";

  if (topicRow?.chapter.trim().toLowerCase() === "crossword") {
    const crosswordQuiz = await getCrosswordQuizBySlug(supabase, slugDecoded);
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
