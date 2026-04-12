"use client";

import type { KeyboardEvent } from "react";
import DefaultEditor from "react-simple-wysiwyg";
import { cn } from "@/lib/utils";

export interface QuestionTitleEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** Визуально подсветить ошибку валидации (как у shadcn Input). */
  invalid?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Rich-text редактор для текста вопроса (HTML в value).
 * Для типов с пропусками `[[]]` вставляйте маркеры как обычный текст.
 */
export function QuestionTitleEditor({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  id,
  name,
  placeholder = "Use [[]] where the user should type or choose",
  className,
}: QuestionTitleEditorProps) {
  /** В `contenteditable` на базе `<div>` Enter по умолчанию даёт `<div><br></div>`; вставляем мягкий перенос. */
  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    document.execCommand("insertLineBreak");
  }

  return (
    <div className={cn("w-full min-w-0", className)}>
      <DefaultEditor
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        containerProps={{
          className: cn(
            "border-input bg-background w-full min-w-0 overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow]",
            "min-h-[120px] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_.rsw-toolbar]:border-border [&_.rsw-toolbar]:bg-muted/80 [&_.rsw-toolbar]:border-b",
            "[&_.rsw-separator]:border-border",
            "[&_.rsw-btn]:text-foreground [&_.rsw-btn:hover]:bg-muted [&_.rsw-btn[data-active=true]]:bg-muted",
            invalid &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40"
          ),
        }}
        className={cn(
          "text-foreground min-h-[80px] bg-transparent px-2 py-2 text-base md:text-sm",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  );
}
