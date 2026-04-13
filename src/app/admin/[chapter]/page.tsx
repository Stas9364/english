import { notFound } from "next/navigation";
import { isChapter } from "@/lib/chapters";
import { createServerClient, getTopicsByChapter } from "@/lib/supabase";
import { AdminScreen } from "@/components/screens/AdminScreen";

interface AdminChapterPageProps {
  params: Promise<{ chapter: string }>;
}

export default async function AdminChapterPage({ params }: AdminChapterPageProps) {
  const { chapter: chapterParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  if (!isChapter(chapter)) notFound();

  const supabase = await createServerClient();
  const topics = await getTopicsByChapter(supabase, chapter);

  return <AdminScreen chapter={chapter} topics={topics} />;
}
