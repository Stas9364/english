import { notFound } from "next/navigation";
import { isChapter } from "@/lib/chapters";
import {
  createServerClient,
  getQuizzesByTopicSlugAndChapter,
  getTopicBySlugAndChapter,
} from "@/lib/supabase";
import { AdminTopicQuizzesScreen } from "@/components/screens/AdminTopicQuizzesScreen";

interface AdminTopicPageProps {
  params: Promise<{ chapter: string; topicSlug: string }>;
}

export default async function AdminTopicPage({ params }: AdminTopicPageProps) {
  const { chapter: chapterParam, topicSlug: topicSlugParam } = await params;
  const chapter = decodeURIComponent(chapterParam).trim();
  const topicSlug = decodeURIComponent(topicSlugParam).trim();
  if (!isChapter(chapter) || !topicSlug) notFound();

  const supabase = await createServerClient();
  const topic = await getTopicBySlugAndChapter(supabase, topicSlug, chapter);
  if (!topic) notFound();

  const quizzes = await getQuizzesByTopicSlugAndChapter(supabase, topicSlug, chapter);
  return <AdminTopicQuizzesScreen topic={topic} quizzes={quizzes} />;
}
