import { notFound } from "next/navigation";
import { CreateQuizScreen } from "@/components/screens/CreateQuizScreen";
import { PageContainer } from "@/components/page-container";
import { createServerClient, getAdminChapterByKey, getTopicsByChapter } from "@/lib/supabase";

interface AdminCreateQuizPageProps {
  params: Promise<{ chapter: string }>;
}

export default async function AdminCreateQuizPage({ params }: AdminCreateQuizPageProps) {
  const { chapter: chapterParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  if (!chapter) notFound();

  const supabase = await createServerClient();

  const chapterMeta = await getAdminChapterByKey(supabase, chapter);
  if (!chapterMeta) notFound();
  
  const topics = await getTopicsByChapter(supabase, chapter);

  return (
    <PageContainer>
      <CreateQuizScreen chapter={chapter} topics={topics} />
    </PageContainer>
  );
}
