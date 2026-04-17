import { notFound } from "next/navigation";
import { createServerClient, getAdminChapterByKey, getTopicsByChapter } from "@/lib/supabase";
import { AdminScreen } from "@/components/screens/AdminScreen";

interface AdminChapterPageProps {
  params: Promise<{ chapter: string }>;
}

export default async function AdminChapterPage({ params }: AdminChapterPageProps) {
  const { chapter: chapterParam } = await params;  
  const chapter = decodeURIComponent(chapterParam).trim();
  if (!chapter) notFound();  

  const supabase = await createServerClient();
  
  const chapterMeta = await getAdminChapterByKey(supabase, chapter);
  if (!chapterMeta) notFound();

  const topics = await getTopicsByChapter(supabase, chapter);

  return <AdminScreen chapter={chapter} chapterName={chapterMeta.name} topics={topics} />;
}
