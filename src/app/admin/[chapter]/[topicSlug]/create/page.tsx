import { notFound } from "next/navigation";
import { CreateQuizScreen } from "@/components/screens/CreateQuizScreen";
import { CreateCrosswordScreen } from "@/components/screens/CreateCrosswordScreen";
import { PageContainer } from "@/components/page-container";
import {
  createServerClient,
  getAdminChapterByKey,
  getCrosswordOptions,
  getTopicBySlugAndChapter,
  getTopicsByChapter,
} from "@/lib/supabase";

interface AdminCreateQuizInTopicPageProps {
  params: Promise<{ chapter: string; topicSlug: string }>;
}

export default async function AdminCreateQuizInTopicPage({ params }: AdminCreateQuizInTopicPageProps) {
  const { chapter: chapterParam, topicSlug: topicSlugParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  const topicSlug = decodeURIComponent(topicSlugParam).trim();
  if (!chapter || !topicSlug) notFound();

  const supabase = await createServerClient();

  const chapterMeta = await getAdminChapterByKey(supabase, chapter);
  if (!chapterMeta) notFound();

  const topic = await getTopicBySlugAndChapter(supabase, topicSlug, chapter);
  if (!topic) notFound();

  const [topics, crosswordOptions] = await Promise.all([
    getTopicsByChapter(supabase, chapter),
    getCrosswordOptions(supabase),
  ]);

  if (chapter.trim().toLowerCase() === "crossword") {
    return (
      <PageContainer>
        <CreateCrosswordScreen chapter={chapter} topic={topic} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <CreateQuizScreen
        chapter={chapter}
        topics={topics}
        crosswordOptions={crosswordOptions}
        initialTopicId={topic.id}
        topicSlug={topic.slug}
      />
    </PageContainer>
  );
}
