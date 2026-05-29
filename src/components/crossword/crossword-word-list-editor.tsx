"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CrosswordWordInput } from "@/lib/crossword";

const textareaClass =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

type CrosswordWordListEditorProps = {
  words: CrosswordWordInput[];
  onChange: (words: CrosswordWordInput[]) => void;
};

export function CrosswordWordListEditor({ words, onChange }: CrosswordWordListEditorProps) {
  function updateWord(index: number, patch: Partial<CrosswordWordInput>) {
    onChange(words.map((word, wordIndex) => (wordIndex === index ? { ...word, ...patch } : word)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Words and clues</Label>
          <p className="text-sm text-muted-foreground">Minimum 5 words. Use English letters only.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...words, { answer: "", clue: "" }])}>
          <Plus data-icon="inline-start" />
          Add word
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {words.map((word, index) => (
          <div key={index} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Word {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(words.filter((_, wordIndex) => wordIndex !== index))}
                disabled={words.length <= 5}
                title="Remove word"
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`crossword-word-${index}`}>Answer</Label>
                <Input
                  id={`crossword-word-${index}`}
                  value={word.answer}
                  onChange={(event) => updateWord(index, { answer: event.target.value })}
                  placeholder="APPLE"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`crossword-clue-${index}`}>Clue</Label>
                <textarea
                  id={`crossword-clue-${index}`}
                  value={word.clue}
                  onChange={(event) => updateWord(index, { clue: event.target.value })}
                  placeholder="A fruit"
                  className={cn(textareaClass, "resize-y")}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
