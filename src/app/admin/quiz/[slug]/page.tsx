import { notFound } from "next/navigation";
import {
  createServerClient,
  getQuizWithPagesBySlug,
  getTheoryBlocks,
  getTopicMetaById,
  getTopicsByChapter,
} from "@/lib/supabase";
import { EditQuizScreen } from "@/components/screens/EditQuizScreen";

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
