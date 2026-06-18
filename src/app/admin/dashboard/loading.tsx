import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5 pb-0">
        <Skeleton className="h-3 w-24" />
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-28" />
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardLoading() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>

        <section className="space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-56" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-16 rounded-md" />
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="gap-4 py-5 lg:col-span-1">
                <CardHeader className="px-5 pb-0">
                  <Skeleton className="h-3 w-28" />
                </CardHeader>
                <CardContent className="space-y-2 px-5">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>

              <Card className="gap-4 py-5 lg:col-span-2">
                <CardHeader className="px-5 pb-0">
                  <Skeleton className="h-3 w-32" />
                </CardHeader>
                <CardContent className="px-5">
                  <Skeleton className="h-[220px] w-full rounded-md" />
                </CardContent>
              </Card>
            </div>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5 pb-0">
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent className="space-y-3 px-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
                    <Skeleton className="h-4 w-3/5 max-w-xs" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
