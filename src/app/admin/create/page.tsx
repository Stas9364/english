import { PageContainer } from "@/components/page-container";
import { CreateQuizScreen } from "@/components/screens/CreateQuizScreen";
import { createServerClient, getTopics } from "@/lib/supabase";

export default async function AdminCreateQuizPage() {
  const supabase = await createServerClient();
  const topics = await getTopics(supabase);

  return (
    <PageContainer>
      <CreateQuizScreen topics={topics} />
    </PageContainer>
  );
}
