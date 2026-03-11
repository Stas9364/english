"use client";

import { Wand2 } from "lucide-react";
import type { TestType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface QuizAiGenerationBlockProps {
  topic: string;
  level: string;
  language: "RU" | "EN";
  questionsPerPage: number | string;
  selectedType: TestType;
  style: string;
  constraints: string;
  lexicon: string;
  bannedTopics: string;

  onTopicChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onLanguageChange: (value: "RU" | "EN") => void;
  onQuestionsPerPageChange: (value: number) => void;
  onSelectedTypeChange: (value: TestType) => void;
  onStyleChange: (value: string) => void;
  onConstraintsChange: (value: string) => void;
  onLexiconChange: (value: string) => void;
  onBannedTopicsChange: (value: string) => void;

  generateLabel?: string;
  helperText?: string;

  isGenerating: boolean;
  onGenerate: () => void;

  generatedSummary?: string | null;
  errorMessage?: string | null;
}

export function QuizAiGenerationBlock({
  topic,
  level,
  language,
  questionsPerPage,
  selectedType,
  style,
  constraints,
  lexicon,
  bannedTopics,
  onTopicChange,
  onLevelChange,
  onLanguageChange,
  onQuestionsPerPageChange,
  onSelectedTypeChange,
  onStyleChange,
  onConstraintsChange,
  onLexiconChange,
  onBannedTopicsChange,
  generateLabel = "Generate page",
  helperText,
  isGenerating,
  onGenerate,
  generatedSummary,
  errorMessage,
}: QuizAiGenerationBlockProps) {
  const questionsValue = typeof questionsPerPage === "number" ? String(questionsPerPage) : questionsPerPage;

  return (
    <Card className="border border-blue-400">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="size-4" />
            AI generation (Gemini)
          </CardTitle>
          <CardDescription>
            Generates pages that match the quiz format and inserts them into the form below. Review and adjust questions
            before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Topic (required)</Label>
              <Input
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                placeholder="e.g. Present Simple (routine)"
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Input
                value={level}
                onChange={(e) => onLevelChange(e.target.value)}
                placeholder="A1, A2, B1, B2, C1…"
              />
            </div>
            <div className="space-y-2">
              <Label>Explanation language</Label>
              <select
                className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:scheme-dark"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as "RU" | "EN")}
              >
                <option value="RU">RU</option>
                <option value="EN">EN</option>
              </select>
            </div>
          </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 w-full sm:max-w-[182px]">
            <Label>Pages per request</Label>
            <Input value="1" readOnly disabled />
          </div>
          <div className="space-y-2 w-full sm:max-w-[182px]">
            <Label>Questions per page</Label>
            <Input
              inputMode="numeric"
              value={questionsValue}
              onChange={(e) => onQuestionsPerPageChange(Number(e.target.value))}
              placeholder="5"
            />
          </div>
          <div className="space-y-2 w-full sm:flex-1">
            <Label>Page type to generate</Label>
            <div className="flex flex-wrap gap-3 h-9">
              {(["single", "multiple", "input", "select_gaps"] as TestType[]).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    checked={selectedType === t}
                    onChange={() => onSelectedTypeChange(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Style (optional)</Label>
            <Input
              value={style}
              onChange={(e) => onStyleChange(e.target.value)}
              placeholder="Short sentences, everyday topics…"
            />
          </div>
          <div className="space-y-2">
            <Label>Constraints (optional)</Label>
            <Input
              value={constraints}
              onChange={(e) => onConstraintsChange(e.target.value)}
              placeholder="No proper names, no numbers…"
            />
          </div>
          <div className="space-y-2">
            <Label>Lexis (optional)</Label>
            <Input
              value={lexicon}
              onChange={(e) => onLexiconChange(e.target.value)}
              placeholder="Words / topics that must be included"
            />
          </div>
          <div className="space-y-2">
            <Label>Forbidden topics (optional)</Label>
            <Input
              value={bannedTopics}
              onChange={(e) => onBannedTopicsChange(e.target.value)}
              placeholder="e.g. politics, violence…"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            {helperText && (
              <p className="text-xs text-muted-foreground max-w-xs">
                {helperText}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || !topic.trim() || !selectedType}
              title="Сгенерировать одну страницу и применить по выбранному режиму"
            >
              {isGenerating ? "Generating…" : generateLabel}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {generatedSummary && !errorMessage && (
          <Alert>
            <AlertDescription>{generatedSummary}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

