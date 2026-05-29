"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { generateCrosswordAction, saveCrosswordQuiz } from "@/app/admin/actions";
import { CrosswordGridEditor } from "@/components/crossword/crossword-grid-editor";
import { CrosswordWordListEditor } from "@/components/crossword/crossword-word-list-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import type { CrosswordLayout, CrosswordWordInput } from "@/lib/crossword";
import type { Chapter } from "@/lib/chapters";

function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "crossword";
}

const initialWords: CrosswordWordInput[] = Array.from({ length: 5 }, () => ({ answer: "", clue: "" }));

export function CreateCrosswordScreen({
  chapter,
  topic,
}: {
  chapter: Chapter;
  topic: { id: string; slug: string; name: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [words, setWords] = useState<CrosswordWordInput[]>(initialWords);
  const [layout, setLayout] = useState<CrosswordLayout | null>(null);
  const [isLayoutValid, setIsLayoutValid] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateWords(nextWords: CrosswordWordInput[]) {
    setWords(nextWords);
    setLayout(null);
    setIsLayoutValid(true);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    const result = await generateCrosswordAction(words);
    setIsGenerating(false);

    if (!result.ok) {
      setLayout(null);
      setError(result.error);
      toast.error("Failed to generate crossword", { description: result.error });
      return;
    }

    setLayout(result.layout);
    setIsLayoutValid(true);
    toast.success("Crossword generated");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!layout) {
      setError("Generate crossword before saving");
      return;
    }
    if (!isLayoutValid) {
      setError("Fix layout conflicts before saving");
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await saveCrosswordQuiz({
      topic_id: topic.id,
      title,
      description,
      slug: slugify(title),
      width: layout.width,
      height: layout.height,
      grid: layout.grid,
      entries: layout.entries,
    });
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save crossword");
      toast.error("Failed to save crossword", { description: result.error ?? "Please try again." });
      return;
    }

    toast.success("Crossword saved");
    router.push(`/admin/quiz/${result.slug}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/${chapter}/${topic.slug}`}>Back to quizzes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create crossword</CardTitle>
          <CardDescription>Add words and clues, generate a grid, then save the approved layout.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="crossword-title">Title</Label>
                <Input id="crossword-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="crossword-description">Description</Label>
                <Input
                  id="crossword-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Instructions shown before the crossword"
                />
              </div>
            </div>

            <CrosswordWordListEditor words={words} onChange={updateWords} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate crossword"}
              </Button>
              <span className="text-sm text-muted-foreground">Grid size is generated automatically up to 20x20.</span>
            </div>

            {layout ? (
              <CrosswordGridEditor layout={layout} onChange={setLayout} onValidationChange={setIsLayoutValid} />
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <LoadingSubmitButton
              isLoading={isSaving}
              idleText="Save crossword"
              disabled={!layout || !isLayoutValid || isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
