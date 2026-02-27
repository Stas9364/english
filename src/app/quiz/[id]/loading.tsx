import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
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
      </main>
    </div>
  );
}
