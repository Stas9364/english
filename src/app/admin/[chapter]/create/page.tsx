import { notFound } from "next/navigation";
import { isChapter } from "@/lib/chapters";
import { PageContainer } from "@/components/page-container";
import { CreateQuizScreen } from "@/components/screens/CreateQuizScreen";
import { createServerClient, getTopicsByChapter } from "@/lib/supabase";

interface AdminCreateQuizPageProps {
  params: Promise<{ chapter: string }>;
}

export default async function AdminCreateQuizPage({ params }: AdminCreateQuizPageProps) {
  const { chapter: chapterParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  if (!isChapter(chapter)) notFound();

  const supabase = await createServerClient();
  const topics = await getTopicsByChapter(supabase, chapter);

  return (
    <PageContainer>
      <CreateQuizScreen chapter={chapter} topics={topics} />
    </PageContainer>
  );
}
