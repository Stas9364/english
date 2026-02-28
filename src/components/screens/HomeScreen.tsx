import Link from "next/link";
import type { Quiz } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

interface HomeScreenProps {
  quizzes: Quiz[];
}

export function HomeScreen({ quizzes }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight">
          English quizzes
        </h1>

        {quizzes.length === 0 ? (
          <p className="text-muted-foreground">
            No quizzes yet. Add quizzes in the admin panel.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <Card className="flex h-full flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {quiz.description && (
                      <CardDescription className="line-clamp-2">
                        {quiz.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter className="mt-auto">
                    <Button asChild size="sm">
                      <Link href={`/quiz/${quiz.slug}`}>Start quiz</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
