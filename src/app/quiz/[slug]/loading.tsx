import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="hidden shrink-0 gap-2 sm:flex">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
        <ul className="space-y-8">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-4/5" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <Skeleton className="h-10 w-40" />
        </div>
      </PageContainer>
    </div>
  );
}
