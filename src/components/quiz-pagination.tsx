import type { QuizPageWithDetails } from '@/lib/supabase';
import { Button } from './ui/button';

interface QuizPaginationProps {
    hasPrevPage: boolean;
    hasNextPage: boolean;
    pages: QuizPageWithDetails[];
    pageIndex: number;
    setPageIndex: (index: number) => void;
}

export function QuizPagination({ hasPrevPage, hasNextPage, pages, pageIndex, setPageIndex }: QuizPaginationProps) {
    const goToPage = (index: number) => {
        if (index === pageIndex) return;
        setPageIndex(index);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Quiz pages">
        <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={!hasPrevPage}
        >
            Previous page
        </Button>
        <span className="flex items-center gap-1 px-2">
            {pages.map((page, i) => (
                <Button
                    key={page.id}
                    variant={pageIndex === i ? "default" : "outline"}
                    size="sm"
                    className="min-w-9"
                    onClick={() => goToPage(i)}
                    aria-label={`Page ${i + 1}`}
                    aria-current={pageIndex === i ? "true" : undefined}
                >
                    {i + 1}
                </Button>
            ))}
        </span>
        <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={!hasNextPage}
        >
            Next page
        </Button>
    </nav>
}