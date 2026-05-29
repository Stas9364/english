"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { generateCrosswordAction, saveCrosswordQuiz } from "@/app/admin/actions";
import { CrosswordGridEditor } from "@/components/crossword/crossword-grid-editor";
import { CrosswordWordListEditor } from "@/components/crossword/crossword-word-list-editor";
import { PageContainer } from "@/components/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import type { CrosswordLayout, CrosswordWordInput } from "@/lib/crossword";
import type { CrosswordQuiz } from "@/lib/supabase";

function getInitialLayout(quiz: CrosswordQuiz): CrosswordLayout {
  return {
    width: quiz.crossword.width,
    height: quiz.crossword.height,
    grid: quiz.crossword.grid,
    entries: quiz.crossword.entries.map((entry) => ({
      answer: entry.answer,
      clue: entry.clue,
      direction: entry.direction,
      row: entry.row,
      col: entry.col,
      number: entry.number,
      order_index: entry.order_index,
    })),
  };
}

export function EditCrosswordScreen({
  quiz,
  backToTopicHref,
}: {
  quiz: CrosswordQuiz;
  backToTopicHref: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");
  const [words, setWords] = useState<CrosswordWordInput[]>(
    quiz.crossword.entries.map((entry) => ({ answer: entry.answer, clue: entry.clue }))
  );
  const [layout, setLayout] = useState<CrosswordLayout | null>(getInitialLayout(quiz));
  const [isLayoutValid, setIsLayoutValid] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateWords(nextWords: CrosswordWordInput[]) {
    setWords(nextWords);
    setLayout((current) => {
      if (!current || current.entries.length !== nextWords.length) return null;
      const sameAnswers = current.entries.every(
        (entry, index) => entry.answer === nextWords[index]?.answer.trim().toUpperCase()
      );
      if (!sameAnswers) return null;
      return {
        ...current,
        entries: current.entries.map((entry, index) => ({
          ...entry,
          clue: nextWords[index]?.clue ?? entry.clue,
        })),
      };
    });
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
      quizId: quiz.id,
      topic_id: quiz.topic_id,
      title,
      description,
      slug: quiz.slug,
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
    router.refresh();
  }

  return (
    <PageContainer className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Edit crossword</h2>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/quiz/${quiz.slug}`}>
            View crossword
          </Link>
        </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={backToTopicHref}>Back to quizzes</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit crossword</CardTitle>
          <CardDescription>Regenerate or drag whole words, then save the approved layout.</CardDescription>
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
                />
              </div>
            </div>

            <CrosswordWordListEditor words={words} onChange={updateWords} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Regenerate crossword"}
              </Button>
              <span className="text-sm text-muted-foreground">Changing answers requires regeneration.</span>
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
    </PageContainer>
  );
}
