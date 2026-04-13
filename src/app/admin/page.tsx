import { createServerClient, getTopics } from "@/lib/supabase";
import { AdminScreen } from "@/components/screens/AdminScreen";

export default async function AdminPage() {
  const supabase = await createServerClient();
  const topics = await getTopics(supabase);
  return <AdminScreen topics={topics} />;
}
