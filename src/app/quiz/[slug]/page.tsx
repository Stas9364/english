import { notFound } from "next/navigation";
import { createServerClient, getQuizWithPagesBySlug } from "@/lib/supabase";
import { QuizScreen } from "@/components/screens/QuizScreen";

interface QuizPageProps {
  params: Promise<{ slug: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { slug } = await params;
  const slugDecoded = decodeURIComponent(slug).trim();
  if (!slugDecoded) notFound();

  const supabase = await createServerClient();
  const quiz = await getQuizWithPagesBySlug(supabase, slugDecoded);

  if (!quiz) notFound();

  return <QuizScreen quiz={quiz} />;
}
