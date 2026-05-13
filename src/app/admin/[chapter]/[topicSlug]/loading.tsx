import { PageContainer } from "@/components/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTopicLoading() {
  return (
    <PageContainer className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your quizzes</CardTitle>
          <CardDescription>
            All quizzes. Click the pencil icon to edit, or View to open the quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[1, 2, 3].map((i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/5 max-w-xs" />
                  <Skeleton className="h-4 w-4/5 max-w-sm" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="h-8 w-14 rounded-md" />
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
