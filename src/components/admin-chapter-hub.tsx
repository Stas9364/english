import Link from "next/link";
import { CHAPTERS, CHAPTER_LABELS } from "@/lib/chapters";
import { PageContainer } from "@/components/page-container";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminChapterHub() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sections</h1>
        <p className="text-sm text-muted-foreground">Choose a section to open topics and quizzes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CHAPTERS.map((chapter) => (
          <Link
            key={chapter}
            href={`/admin/${chapter}`}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-shadow hover:border-primary/60 hover:shadow-md">
              <CardHeader className="gap-1">
                <CardTitle className="text-lg transition-colors group-hover:text-primary">
                  {CHAPTER_LABELS[chapter]}
                </CardTitle>
                <CardDescription>Open topics and quizzes in this section.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
