import { AdminDashboardScreen } from "@/components/screens/AdminDashboardScreen";
import { getSupabaseDiskStats } from "@/lib/supabase-disk-stats";
import { getUpstashRedisStats } from "@/lib/upstash-redis-stats";

export default async function AdminDashboardPage() {
  const [redisStats, diskStats] = await Promise.all([
    getUpstashRedisStats(),
    getSupabaseDiskStats(),
  ]);

  return <AdminDashboardScreen redisStats={redisStats} diskStats={diskStats} />;
}
