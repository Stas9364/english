import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UPSTASH_FREE_TIER_LIMITS,
  type UpstashRedisStats,
} from "@/lib/upstash-redis-stats";
import { cn } from "@/lib/utils";

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return Number.isInteger(millions) ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return Number.isInteger(thousands) ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }
  return String(value);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  const rounded =
    value >= 100 || exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10;

  return `${rounded} ${units[exponent]}`;
}

function usagePercent(value: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (value / limit) * 100);
}

function usageStatus(percent: number): { label: string; className: string } {
  if (percent >= 90) {
    return { label: "Near limit", className: "text-destructive" };
  }
  if (percent >= 75) {
    return { label: "High usage", className: "text-amber-600 dark:text-amber-400" };
  }
  return { label: "It's all right.", className: "text-emerald-600 dark:text-emerald-400" };
}

function UsageBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  currentLabel: string;
  limitLabel: string;
  percent: number;
  footer?: React.ReactNode;
}

function MetricCard({ title, currentLabel, limitLabel, percent, footer }: MetricCardProps) {
  const status = usageStatus(percent);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="text-2xl font-semibold tracking-tight">
          {currentLabel}
          <span className="text-muted-foreground text-base font-normal">
            {" "}
            / {limitLabel}
          </span>
        </div>
        <UsageBar percent={percent} />
        {footer ?? (
          <p className={cn("text-sm", status.className)}>{status.label}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface AdminRedisStatsProps {
  stats: UpstashRedisStats;
}

export function AdminRedisStats({ stats }: AdminRedisStatsProps) {
  const commandsPercent = usagePercent(
    stats.total_monthly_requests,
    UPSTASH_FREE_TIER_LIMITS.monthlyCommands
  );

  const storagePercent = usagePercent(
    stats.current_storage,
    UPSTASH_FREE_TIER_LIMITS.storageBytes
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Commands"
          currentLabel={formatCompactCount(stats.total_monthly_requests)}
          limitLabel="500k per month"
          percent={commandsPercent}
          footer={
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Writes: {stats.total_monthly_write_requests}
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-sky-500" />
                  Reads: {stats.total_monthly_read_requests}
                </span>
              </div>
            </div>
          }
        />

        <MetricCard
          title="Storage"
          currentLabel={formatBytes(stats.current_storage)}
          limitLabel="256 MB"
          percent={storagePercent}
        />
      </div>
    </div>
  );
}
