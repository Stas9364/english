import { createServerClient, getQuizzes } from "@/lib/supabase";
import { AdminScreen } from "@/components/screens/AdminScreen";

export default async function AdminPage() {
  const supabase = await createServerClient();
  const quizzes = await getQuizzes(supabase);
  return <AdminScreen quizzes={quizzes} />;
}
