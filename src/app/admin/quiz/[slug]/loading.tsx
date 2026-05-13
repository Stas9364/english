import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEditQuizLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 border-b pb-0">
            <Skeleton className="h-10 w-40 rounded-none border-b-2 border-transparent" />
            <Skeleton className="h-10 w-24 rounded-none" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full max-w-xs" />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>

          <Skeleton className="h-10 w-36 rounded-md" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
