"use client";

import { Wand2 } from "lucide-react";
import type { TestType } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect, useRef } from "react";
import { InputField } from './input-field';
import { SelectField } from './select-field';

export interface QuizAiGenerationBlockProps {
  topic: string;
  level: string;
  language: "RU" | "EN";
  questionsPerPage: number | string;
  selectedType: TestType;
  customTask: string;
  style: string;
  constraints: string;
  lexicon: string;
  bannedTopics: string;

  onTopicChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onLanguageChange: (value: "RU" | "EN") => void;
  onQuestionsPerPageChange: (value: number) => void;
  onSelectedTypeChange: (value: TestType) => void;
  onCustomTaskChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onConstraintsChange: (value: string) => void;
  onLexiconChange: (value: string) => void;
  onBannedTopicsChange: (value: string) => void;

  generateLabel?: string;
  helperText?: string;

  isGenerating: boolean;
  onGenerate: (topicValue: string) => void;

  generatedSummary?: string | null;
  errorMessage?: string | null;
}

function useLocalTextField(external: string) {
  const [local, setLocal] = useState(external);

  useEffect(() => {
    setLocal(external);
  }, [external]);

  const syncIfChanged = (onChange: (value: string) => void) => {
    if (local !== external) {
      onChange(local);
    }
  };

  return { local, setLocal, syncIfChanged };
}

export function QuizAiGenerationBlock({
  topic,
  level,
  language,
  questionsPerPage,
  selectedType,
  customTask,
  style,
  constraints,
  lexicon,
  bannedTopics,
  onTopicChange,
  onLevelChange,
  onLanguageChange,
  onQuestionsPerPageChange,
  onSelectedTypeChange,
  onCustomTaskChange,
  onStyleChange,
  onConstraintsChange,
  onLexiconChange,
  onBannedTopicsChange,
  generateLabel = "Generate page",
  helperText = "The first successful generation replaces the current pages; all subsequent generations append new pages to the end.",
  isGenerating,
  onGenerate,
  generatedSummary,
  errorMessage,
}: QuizAiGenerationBlockProps) {
  const customTaskTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const questionsValue = typeof questionsPerPage === "number" ? String(questionsPerPage) : questionsPerPage;
  const MAX_CUSTOM_TASK_CHARS = 350000;

  const topicField = useLocalTextField(topic);
  const styleField = useLocalTextField(style);
  const constraintsField = useLocalTextField(constraints);
  const lexiconField = useLocalTextField(lexicon);
  const bannedTopicsField = useLocalTextField(bannedTopics);
  const customTaskField = useLocalTextField(customTask);
  const questionsField = useLocalTextField(questionsValue);

  const commitQuestionsPerPage = () => {
    const n = questionsField.local === "" ? 0 : Number(questionsField.local);
    if (n !== Number(questionsValue)) {
      onQuestionsPerPageChange(n);
    }
  };

  const handleCustomTaskBlur = () => {
    customTaskField.syncIfChanged(onCustomTaskChange);
  };

  const resizeCustomTaskTextarea = () => {
    const el = customTaskTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeCustomTaskTextarea();
  }, [customTaskField.local]);

  const handleGenerateClick = () => {
    topicField.syncIfChanged(onTopicChange);
    styleField.syncIfChanged(onStyleChange);
    constraintsField.syncIfChanged(onConstraintsChange);
    lexiconField.syncIfChanged(onLexiconChange);
    bannedTopicsField.syncIfChanged(onBannedTopicsChange);
    customTaskField.syncIfChanged(onCustomTaskChange);
    commitQuestionsPerPage();
    onGenerate(topicField.local);
  };

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
          <InputField label="Topic (required)" value={topicField.local} onChange={(e) => topicField.setLocal(e.target.value)} placeholder="e.g. Present Simple (routine)" wrapperClassName="sm:col-span-2" />
          
          <SelectField label="Level" value={level} onChange={(e) => onLevelChange(e.target.value)} options={["A1", "A2", "B1", "B2", "C1", "C2"]} />
          <SelectField label="Explanation language" value={language} onChange={(e) => onLanguageChange(e.target.value as "RU" | "EN")} options={["RU", "EN"]} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Custom task (optional)</Label>
            <span className="text-[11px] text-muted-foreground">
              {customTaskField.local.length.toLocaleString("en-US")} / {MAX_CUSTOM_TASK_CHARS.toLocaleString("en-US")}
            </span>
          </div>
          <textarea
            ref={customTaskTextareaRef}
            value={customTaskField.local}
            onChange={(e) => customTaskField.setLocal(e.target.value)}
            onInput={resizeCustomTaskTextarea}
            onBlur={handleCustomTaskBlur}
            placeholder="Paste your own exercise description or instructions here. Gemini will convert it into a quiz page according to the settings above."
            rows={4}
            maxLength={MAX_CUSTOM_TASK_CHARS}
            className="placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none resize-none overflow-hidden min-h-[80px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[7rem_8rem_1fr] sm:items-start">
          <div className="space-y-2">
            <Label className="text-muted-foreground whitespace-nowrap text-xs font-medium">Pages per request</Label>
            <Input value="1" readOnly disabled className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground whitespace-nowrap text-xs font-medium">Questions per page</Label>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={questionsField.local}
              onChange={(e) => questionsField.setLocal(e.target.value.replace(/\D/g, ""))}
              onBlur={commitQuestionsPerPage}
              placeholder="5"
              className="h-9 w-full"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label className="text-muted-foreground text-xs font-medium mb-4">Page type to generate</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {(["single", "multiple", "input", "select_gaps", "matching"] as TestType[]).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
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
          <InputField label="Style (optional)" value={styleField.local} onChange={(e) => styleField.setLocal(e.target.value)} placeholder="Short sentences, everyday topics…" wrapperClassName="space-y-2" />
          <InputField label="Constraints (optional)" value={constraintsField.local} onChange={(e) => constraintsField.setLocal(e.target.value)} placeholder="No proper names, no numbers…" wrapperClassName="space-y-2" />
          <InputField label="Lexis (optional)" value={lexiconField.local} onChange={(e) => lexiconField.setLocal(e.target.value)} placeholder="Words / topics that must be included" wrapperClassName="space-y-2" />
          <InputField label="Forbidden topics (optional)" value={bannedTopicsField.local} onChange={(e) => bannedTopicsField.setLocal(e.target.value)} placeholder="e.g. politics, violence…" wrapperClassName="space-y-2" />
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
              onClick={handleGenerateClick}
              disabled={isGenerating || !topicField.local.trim() || !selectedType}
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

