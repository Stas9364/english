"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  BtnBold,
  BtnBulletList,
  BtnClearFormatting,
  BtnItalic,
  BtnLink,
  BtnNumberedList,
  BtnRedo,
  BtnStrikeThrough,
  BtnStyles,
  BtnUnderline,
  BtnUndo,
  Editor,
  EditorProvider,
  HtmlButton,
  Separator,
  Toolbar,
  createButton,
} from "react-simple-wysiwyg";
import { useDebouncedDraftValue } from "@/hooks/use-debounced-draft-value";
import { useSanitizeEmptyEditorPaste } from "@/hooks/use-sanitize-empty-editor-paste";
import { cn } from "@/lib/utils";

export interface QuestionTitleColorEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  invalid?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  sanitizePasteWhenEmpty?: boolean;
}

const SAVE_DELAY_MS = 500;

const BtnTextRed = createButton(
  "Red text",
  <span style={{ color: "#dc2626", fontWeight: 700 }}>A</span>,
  () => {
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, "#dc2626");
  }
);

export function QuestionTitleColorEditor({
  value,
  onChange,
  disabled,
  autoFocus = false,
  onAutoFocusDone,
  invalid,
  id,
  name,
  placeholder = "Use [[]] where the user should type or choose",
  className,
  sanitizePasteWhenEmpty = false,
}: QuestionTitleColorEditorProps) {
  const hasFocusedRef = useRef(false);
  const [draftValue, setDraftValue] = useDebouncedDraftValue({
    value,
    onChange,
    delayMs: SAVE_DELAY_MS,
  });
  const handlePaste = useSanitizeEmptyEditorPaste({
    enabled: sanitizePasteWhenEmpty,
    draftValue,
    setDraftValue,
  });

  function handleContainerRef(node: HTMLDivElement | null) {
    if (!node || !autoFocus || disabled || hasFocusedRef.current) return;
    requestAnimationFrame(() => {
      const editor = node.querySelector<HTMLElement>('[contenteditable="true"]');
      if (!editor) return;
      editor.focus();
      hasFocusedRef.current = true;
      onAutoFocusDone?.();
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    document.execCommand("insertLineBreak");
  }

  return (
    <div
      ref={handleContainerRef}
      data-question-title-editor-id={id}
      className={cn("w-full min-w-0", className)}
    >
      <EditorProvider>
        <Editor
          id={id}
          name={name}
          value={draftValue}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
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
        >
          <Toolbar>
            <BtnUndo />
            <BtnRedo />
            <Separator />
            <BtnBold />
            <BtnItalic />
            <BtnUnderline />
            <BtnStrikeThrough />
            <BtnTextRed />
            <Separator />
            <BtnNumberedList />
            <BtnBulletList />
            <Separator />
            <BtnLink />
            <BtnClearFormatting />
            <HtmlButton />
            <Separator />
            <BtnStyles />
          </Toolbar>
        </Editor>
      </EditorProvider>
    </div>
  );
}
