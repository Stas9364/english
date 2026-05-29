import { notFound } from "next/navigation";
import {
  createServerClient,
  getCrosswordQuizByQuizId,
  getQuizWithPagesBySlug,
  getTheoryBlocks,
  getTopicMetaById,
  getTopicsByChapter,
} from "@/lib/supabase";
import { EditQuizScreen } from "@/components/screens/EditQuizScreen";
import { EditCrosswordScreen } from "@/components/screens/EditCrosswordScreen";

interface AdminQuizPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminQuizPage({ params }: AdminQuizPageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const quiz = await getQuizWithPagesBySlug(supabase, slug);
  if (!quiz) notFound();

  const topicMeta = await getTopicMetaById(supabase, quiz.topic_id);
  if (!topicMeta) notFound();

  const backToTopicHref = `/admin/${topicMeta.chapter}/${topicMeta.slug}`;

  if (topicMeta.chapter.trim().toLowerCase() === "crossword") {
    const crosswordQuiz = await getCrosswordQuizByQuizId(supabase, quiz.id);
    if (!crosswordQuiz) notFound();
    return <EditCrosswordScreen quiz={crosswordQuiz} backToTopicHref={backToTopicHref} />;
  }

  const [theoryBlocks, topics] = await Promise.all([
    getTheoryBlocks(supabase, quiz.id),
    getTopicsByChapter(supabase, topicMeta.chapter),
  ]);

  return (
    <EditQuizScreen
      quiz={quiz}
      theoryBlocks={theoryBlocks}
      topics={topics}
      chapter={topicMeta.chapter}
      backToTopicHref={backToTopicHref}
    />
  );
}
