import { AdminRedisStats } from "@/components/admin-redis-stats";
import { AdminSupabaseDiskStats } from "@/components/admin-supabase-disk-stats";
import { PageContainer } from "@/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SupabaseDiskStats } from "@/lib/supabase-disk-stats";
import type { UpstashRedisStats } from "@/lib/upstash-redis-stats";

interface AdminDashboardScreenProps {
  redisStats: UpstashRedisStats | null;
  diskStats: SupabaseDiskStats | null;
}

export function AdminDashboardScreen({
  redisStats,
  diskStats,
}: AdminDashboardScreenProps) {
  return (
    <PageContainer>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Infrastructure usage for Upstash Redis and Supabase.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Upstash Redis
          </h2>
          {redisStats ? (
            <AdminRedisStats stats={redisStats} />
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Failed to load Redis stats</AlertTitle>
              <AlertDescription>
                Check that <code className="text-xs">UPSTASH_REDIS_API_KEY</code> is set
                and the Upstash API credentials are valid.
              </AlertDescription>
            </Alert>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Supabase
          </h2>
          {diskStats ? (
            <AdminSupabaseDiskStats stats={diskStats} />
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Failed to load Supabase disk stats</AlertTitle>
              <AlertDescription>
                Check that <code className="text-xs">SUPABASE_API_TOKEN</code> is set
                and the Supabase Management API token is valid.
              </AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
