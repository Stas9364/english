import { AdminChapterHub } from "@/components/admin-chapter-hub";
import { createServerClient, getAdminChapters } from "@/lib/supabase";

export default async function AdminPage() {
  const supabase = await createServerClient();
  const chapters = await getAdminChapters(supabase);
  return <AdminChapterHub chapters={chapters} />;
}
