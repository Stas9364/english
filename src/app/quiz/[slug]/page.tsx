import { notFound } from "next/navigation";
import { createServerClient, getQuizWithPagesBySlug, getTheoryBlocks, getIsAdmin, getTopicMetaById } from "@/lib/supabase";
import { QuizScreen } from "@/components/screens/QuizScreen";

interface QuizPageProps {
  params: Promise<{ slug: string }>;
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

  return (
    <QuizScreen
      quiz={quiz}
      theoryBlocks={theoryBlocks}
      isAdmin={isAdmin}
      adminBackHref={adminBackHref}
    />
  );
}
