import { notFound } from "next/navigation";
import { createServerClient, getQuizWithDetails } from "@/lib/supabase";
import { QuizScreen } from "@/components/screens/QuizScreen";

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const quiz = await getQuizWithDetails(supabase, id);

  if (!quiz) notFound();

  return <QuizScreen quiz={quiz} />;
}
