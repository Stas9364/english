import type { TestType } from '@/lib/supabase';
import type { UseFormReturn } from 'react-hook-form';
import  { PageBlockFormValues } from './page-block';
import { Label } from '../ui/label';

interface PageTypeSelectProps {
    form: UseFormReturn<PageBlockFormValues>;
    pageIndex: number;
    defaultOption: () => { option_text: string; is_correct: boolean };
}

export function PageTypeSelect({ form, pageIndex, defaultOption }: PageTypeSelectProps) {
    return (
        <div className="space-y-2">
            <Label>Page type</Label>
            <select
                className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:scheme-dark"
                value={form.watch(`pages.${pageIndex}.type`)}
                onChange={(e) => {
                    const value = e.target.value as TestType;
                    form.setValue(`pages.${pageIndex}.type`, value);
                    const questions = form.getValues(`pages.${pageIndex}.questions`);
                    if (value === "input" || value === "select_gaps") {
                        form.setValue(
                            `pages.${pageIndex}.questions`,
                            questions.map((q, i) => ({
                                ...q,
                                order_index: i,
                                options: [{ option_text: "", is_correct: true, gap_index: 0 }],
                            }))
                        );
                    } else if (value === "matching") {
                        form.setValue(
                            `pages.${pageIndex}.questions`,
                            questions.map((q, i) => {
                                const one = q.options?.find((o) => o.is_correct) ?? q.options?.[0];
                                return {
                                    ...q,
                                    order_index: i,
                                    options: [{ option_text: one?.option_text ?? "", is_correct: true }],
                                };
                            })
                        );
                    } else {
                        form.setValue(
                            `pages.${pageIndex}.questions`,
                            questions.map((q, i) => ({
                                ...q,
                                order_index: i,
                                options: q.options?.length ? q.options : [defaultOption()],
                            }))
                        );
                    }
                }}
            >
                <option value="single">Single choice</option>
                <option value="multiple">Multiple choice</option>
                <option value="input">Text input</option>
                <option value="select_gaps">Dropdown in gaps</option>
                <option value="matching">Matching</option>
            </select>
        </div>
    );
}
