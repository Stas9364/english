import { notFound } from "next/navigation";
import { isChapter } from "@/lib/chapters";
import { createServerClient, getQuizWithPagesBySlug, getTheoryBlocks, getIsAdmin } from "@/lib/supabase";
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
    supabase.from("topics").select("slug, chapter").eq("id", quiz.topic_id).single(),
  ]);

  const adminBackHref =
    topicRow.data && isChapter(topicRow.data.chapter)
      ? `/admin/${topicRow.data.chapter}/${topicRow.data.slug}`
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
