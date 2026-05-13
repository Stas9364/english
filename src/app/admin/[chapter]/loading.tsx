import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminChapterLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <CardDescription>
            Choose a topic to open quizzes in this category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2 border-b pb-4">
            <div className="min-w-48 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="min-w-48 flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-20 self-end rounded-md" />
          </div>

          <ul className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/5 max-w-xs" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
