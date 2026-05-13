import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminGuideLoading() {
  return (
    <PageContainer className="max-w-5xl space-y-6">
      <header className="space-y-1">
        <Skeleton className="h-5 w-24 mb-4" />
        <Skeleton className="h-9 w-full max-w-2xl" />
        <Skeleton className="h-5 w-full max-w-xl pt-2" />
      </header>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
        <nav className="hidden lg:block space-y-3 border-r pr-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </nav>
        <main className="min-w-0 space-y-8 mt-6 lg:mt-0">
          {[1, 2, 3].map((block) => (
            <section key={block} className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </section>
          ))}
        </main>
      </div>
    </PageContainer>
  );
}
