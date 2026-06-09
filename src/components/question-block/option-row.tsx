import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import type { Option } from "@/lib/supabase";
import { RadioGroupItem } from '../ui/radio-group';
import { cn } from '@/lib/utils';

const correctSurfaceClassName =
    "border-success bg-success-soft dark:bg-success-soft/80";
const incorrectSurfaceClassName =
    "border-error bg-error-soft dark:bg-error-soft/80";

export function OptionRow({
    option,
    isSelected,
    checked,
    multiple,
    onSelect,
}: {
    option: Option;
    isSelected: boolean;
    checked: boolean;
    multiple: boolean;
    onSelect?: (optionId: string) => void;
}) {
    const showCorrect = checked && option.is_correct;
    const showIncorrect = checked && isSelected && !option.is_correct;

    const content = (
        <span
            className={cn(
                "flex-1 text-lg font-normal",
                !multiple && "cursor-pointer",
                showCorrect && "text-success-foreground",
                showIncorrect && "text-error-foreground"
            )}
        >
            {option.option_text}
        </span>
    );

    const wrapperClassName = cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 min-h-[2.75rem]",
        (showCorrect || showIncorrect) && "animate-quiz-result-reveal",
        showCorrect && correctSurfaceClassName,
        showIncorrect && incorrectSurfaceClassName,
        !checked && "cursor-pointer"
    );

    if (multiple) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={checked ? undefined : () => onSelect?.(option.id)}
                onKeyDown={
                    checked
                        ? undefined
                        : (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelect?.(option.id);
                            }
                        }
                }
                className={wrapperClassName}
            >
                <span className="-m-2 flex shrink-0 p-2 pointer-events-none">
                    <Checkbox id={option.id} checked={isSelected} disabled={checked} className="pointer-events-none" />
                </span>
                <Label htmlFor={option.id} className="flex-1 cursor-pointer font-normal py-1 pointer-events-none">
                    {content}
                </Label>
            </div>
        );
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={checked ? undefined : () => onSelect?.(option.id)}
            onKeyDown={
                checked
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect?.(option.id);
                        }
                    }
            }
            className={wrapperClassName}
        >
            <RadioGroupItem value={option.id} id={option.id} className="pointer-events-none" />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer font-normal">
                {content}
            </Label>
        </div>
    );
}