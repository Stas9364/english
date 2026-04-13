import { notFound } from "next/navigation";
import {
  createServerClient,
  getQuizzesByTopicSlug,
  getTopicBySlug,
} from "@/lib/supabase";
import { AdminTopicQuizzesScreen } from "@/components/screens/AdminTopicQuizzesScreen";

interface AdminTopicPageProps {
  params: Promise<{ topicSlug: string }>;
}

export default async function AdminTopicPage({ params }: AdminTopicPageProps) {
  const { topicSlug } = await params;
  const slug = decodeURIComponent(topicSlug).trim();
  if (!slug) notFound();

  const supabase = await createServerClient();
  const topic = await getTopicBySlug(supabase, slug);
  if (!topic) notFound();

  const quizzes = await getQuizzesByTopicSlug(supabase, slug);
  return <AdminTopicQuizzesScreen topic={topic} quizzes={quizzes} />;
}
