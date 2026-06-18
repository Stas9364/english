import { notFound } from "next/navigation";
import { CreateQuizScreen } from "@/components/screens/CreateQuizScreen";
import { CreateCrosswordScreen } from "@/components/screens/CreateCrosswordScreen";
import { PageContainer } from "@/components/page-container";
import {
  canAdminAccessTopic,
  createServerClient,
  getAdminChapterByKey,
  getAdminTopicsByChapter,
  getAdminTopicsScope,
  getCrosswordOptions,
  getTopicBySlugAndChapter,
} from "@/lib/supabase";

interface AdminCreateQuizInTopicPageProps {
  params: Promise<{ chapter: string; topicSlug: string }>;
}

export default async function AdminCreateQuizInTopicPage({ params }: AdminCreateQuizInTopicPageProps) {
  const { chapter: chapterParam, topicSlug: topicSlugParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  const topicSlug = decodeURIComponent(topicSlugParam).trim();
  if (!chapter || !topicSlug) notFound();

  const scope = await getAdminTopicsScope();
  if (!scope) notFound();

  const supabase = await createServerClient();

  const chapterMeta = await getAdminChapterByKey(supabase, chapter);
  if (!chapterMeta) notFound();

  const topic = await getTopicBySlugAndChapter(supabase, topicSlug, chapter);
  if (!topic || !canAdminAccessTopic(topic, scope)) notFound();

  const [topics, crosswordOptions] = await Promise.all([
    getAdminTopicsByChapter(supabase, chapter, scope),
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
