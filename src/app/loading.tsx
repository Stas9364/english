import {
  Card,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-8 h-8 w-64" />
        <ul className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Card className="flex h-full flex-col">
                <CardHeader className="gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-9 w-28" />
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
