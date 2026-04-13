import { notFound } from "next/navigation";
import { isChapter } from "@/lib/chapters";
import {
  createServerClient,
  getQuizWithPages,
  getTheoryBlocks,
  getTopicsByChapter,
} from "@/lib/supabase";
import { EditQuizScreen } from "@/components/screens/EditQuizScreen";

interface AdminQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuizPage({ params }: AdminQuizPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const quiz = await getQuizWithPages(supabase, id);
  if (!quiz) notFound();

  const { data: topicMeta } = await supabase
    .from("topics")
    .select("slug, chapter")
    .eq("id", quiz.topic_id)
    .single();

  if (!topicMeta || !isChapter(topicMeta.chapter)) notFound();

  const backToTopicHref = `/admin/${topicMeta.chapter}/${topicMeta.slug}`;

  const [theoryBlocks, topics] = await Promise.all([
    getTheoryBlocks(supabase, id),
    getTopicsByChapter(supabase, topicMeta.chapter),
  ]);

  return (
    <EditQuizScreen
      quiz={quiz}
      theoryBlocks={theoryBlocks}
      topics={topics}
      backToTopicHref={backToTopicHref}
    />
  );
}
