import { AdminDashboardScreen } from "@/components/screens/AdminDashboardScreen";
import { getSupabaseDiskStats } from "@/lib/supabase-disk-stats";
import { getUpstashRedisStats } from "@/lib/upstash-redis-stats";
import {
  getDailyVisitorStats,
  getTopQuizVisitorStats,
  VISITOR_STATS_PERIODS,
  type VisitorStatsPeriod,
  type VisitorStatsPeriodData,
} from "@/lib/visitor-stats";

async function getVisitorStatsByPeriod(): Promise<
  Record<VisitorStatsPeriod, VisitorStatsPeriodData>
> {
  const entries = await Promise.all(
    VISITOR_STATS_PERIODS.map(async (period) => {
      const [daily, quizzes] = await Promise.all([
        getDailyVisitorStats(period),
        getTopQuizVisitorStats(period),
      ]);
      return [period, { daily, quizzes }] as const;
    })
  );

  return Object.fromEntries(entries) as Record<VisitorStatsPeriod, VisitorStatsPeriodData>;
}

export default async function AdminDashboardPage() {
  const [redisStats, diskStats, visitorStatsByPeriod] = await Promise.all([
    getUpstashRedisStats(),
    getSupabaseDiskStats(),
    getVisitorStatsByPeriod(),
  ]);

  return (
    <AdminDashboardScreen
      redisStats={redisStats}
      diskStats={diskStats}
      visitorStatsByPeriod={visitorStatsByPeriod}
    />
  );
}
