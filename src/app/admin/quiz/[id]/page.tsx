import { notFound } from "next/navigation";
import { createServerClient, getQuizWithDetails } from "@/lib/supabase";
import { EditQuizScreen } from "@/components/screens/EditQuizScreen";

interface AdminQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuizPage({ params }: AdminQuizPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const quiz = await getQuizWithDetails(supabase, id);
  if (!quiz) notFound();

  return <EditQuizScreen quiz={quiz} />;
}
