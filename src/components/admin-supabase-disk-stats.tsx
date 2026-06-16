import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupabaseDiskStats } from "@/lib/supabase-disk-stats";
import { cn } from "@/lib/utils";

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

interface AdminSupabaseDiskStatsProps {
  stats: SupabaseDiskStats;
}

export function AdminSupabaseDiskStats({ stats }: AdminSupabaseDiskStatsProps) {
  const usedPercent = usagePercent(stats.fs_used_bytes, stats.fs_size_bytes);
  const status = usageStatus(usedPercent);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5 pb-0">
          <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Disk Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="text-2xl font-semibold tracking-tight">
            {formatBytes(stats.fs_used_bytes)}
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              / {formatBytes(stats.fs_size_bytes)}
            </span>
          </div>
          <UsageBar percent={usedPercent} />
          <p className={cn("text-sm", status.className)}>{status.label}</p>
          <p className="text-muted-foreground text-sm">
            {formatBytes(stats.fs_avail_bytes)} available
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
