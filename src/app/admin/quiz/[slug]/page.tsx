import { notFound } from "next/navigation";
import type { Chapter } from "@/lib/chapters";
import {
  canAdminAccessTopic,
  createServerClient,
  getAdminTopicsByChapter,
  getAdminTopicsScope,
  getCrosswordOptions,
  getCrosswordQuizByQuizId,
  getQuizWithPagesBySlug,
  getTheoryBlocks,
} from "@/lib/supabase";
import { EditQuizScreen } from "@/components/screens/EditQuizScreen";
import { EditCrosswordScreen } from "@/components/screens/EditCrosswordScreen";

interface AdminQuizPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminQuizPage({ params }: AdminQuizPageProps) {
  const { slug } = await params;
  const scope = await getAdminTopicsScope();
  if (!scope) notFound();

  const supabase = await createServerClient();
  const quiz = await getQuizWithPagesBySlug(supabase, slug);
  if (!quiz) notFound();

  const { data: topicRow } = await supabase
    .from("topics")
    .select("slug, chapter, owner_user_id")
    .eq("id", quiz.topic_id)
    .single();

  if (!topicRow || !canAdminAccessTopic(topicRow, scope)) notFound();

  const chapter = topicRow.chapter as Chapter;
  const backToTopicHref = `/admin/${chapter}/${topicRow.slug}`;

  if (chapter.trim().toLowerCase() === "crossword") {
    const crosswordQuiz = await getCrosswordQuizByQuizId(supabase, quiz.id);
    if (!crosswordQuiz) notFound();
    return <EditCrosswordScreen quiz={crosswordQuiz} backToTopicHref={backToTopicHref} />;
  }

  const [theoryBlocks, topics, crosswordOptions] = await Promise.all([
    getTheoryBlocks(supabase, quiz.id),
    getAdminTopicsByChapter(supabase, chapter, scope),
    getCrosswordOptions(supabase),
  ]);

  return (
    <EditQuizScreen
      quiz={quiz}
      theoryBlocks={theoryBlocks}
      topics={topics}
      crosswordOptions={crosswordOptions}
      chapter={chapter}
      backToTopicHref={backToTopicHref}
    />
  );
}
