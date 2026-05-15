import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCreateQuizLoading() {
  return (
    <PageContainer>
      <div className="mb-4">
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create quiz</CardTitle>
          <CardDescription>
            Add title, description (general task), then add one or more pages. Each page has one question type (single choice,
            multiple choice, text input, or dropdown in gaps).
          </CardDescription>
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
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <Skeleton className="h-5 w-48" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>

          <Skeleton className="h-10 w-36 rounded-md" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
