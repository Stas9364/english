import { useWatch, type UseFormReturn } from 'react-hook-form';
import { QuestionTitleColorEditor } from '../question-title-color-editor';
import { Label } from '../ui/label';
import type { PageBlockFormValues } from './page-block';

interface PageTitleFieldsProps {
    form: UseFormReturn<PageBlockFormValues>;
    pageIndex: number;
}

export function PageTitleFields({ form, pageIndex }: PageTitleFieldsProps) {
    const pageTitle = useWatch({
        control: form.control,
        name: `pages.${pageIndex}.title`,
    }) ?? '';

    const example = useWatch({
        control: form.control,
        name: `pages.${pageIndex}.example`,
    }) ?? '';

    return (
        <>
            <div className="space-y-2">
                <Label>Page title (optional)</Label>
                <QuestionTitleColorEditor
                    value={pageTitle}
                    onChange={(html) => form.setValue(`pages.${pageIndex}.title`, html)}
                    invalid={!!form.formState.errors.pages?.[pageIndex]?.title}
                />
            </div>
            <div className="space-y-2">
                <Label>Example (optional)</Label>
                <QuestionTitleColorEditor
                    value={example}
                    onChange={(html) => form.setValue(`pages.${pageIndex}.example`, html)}
                    invalid={!!form.formState.errors.pages?.[pageIndex]?.example}
                />
            </div>
        </>
    );
}
