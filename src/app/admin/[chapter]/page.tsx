import { notFound } from "next/navigation";
import {
  createServerClient,
  getAdminChapterByKey,
  getAdminTopicsByChapter,
  getAdminTopicsScope,
} from "@/lib/supabase";
import { AdminScreen } from "@/components/screens/AdminScreen";

interface AdminChapterPageProps {
  params: Promise<{ chapter: string }>;
}

export default async function AdminChapterPage({ params }: AdminChapterPageProps) {
  const { chapter: chapterParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  if (!chapter) notFound();

  const scope = await getAdminTopicsScope();
  if (!scope) notFound();

  const supabase = await createServerClient();

  const chapterMeta = await getAdminChapterByKey(supabase, chapter);
  if (!chapterMeta) notFound();

  const topics = await getAdminTopicsByChapter(supabase, chapter, scope);

  return <AdminScreen chapter={chapter} chapterName={chapterMeta.name} topics={topics} />;
}
