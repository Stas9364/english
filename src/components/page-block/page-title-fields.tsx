import type { UseFormReturn } from 'react-hook-form';
import type { PageBlockFormValues } from './page-block';
import { Label } from '../ui/label';

interface PageTitleFieldsProps {
    form: UseFormReturn<PageBlockFormValues>;
    pageIndex: number;
}

export function PageTitleFields({ form, pageIndex }: PageTitleFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label>Page title (optional)</Label>
                <textarea
                    {...form.register(`pages.${pageIndex}.title`)}
                    placeholder="e.g. Choose the right form"
                    rows={4}
                    className="placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none resize-y min-h-[80px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
            </div>
            <div className="space-y-2">
                <Label>Example (optional)</Label>
                <textarea
                    {...form.register(`pages.${pageIndex}.example`)}
                    placeholder="e.g. I usually get up at 7 a.m."
                    rows={4}
                    className="placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none resize-y min-h-[80px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
            </div>
        </>
    );
}
