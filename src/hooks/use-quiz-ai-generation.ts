"use client";

import { useRef, useState } from "react";
import type { GenerateQuizPagesParams, InputMode } from "@/app/admin/ai-generate";
import type { TestType, TheoryBlockType } from "@/lib/supabase";

export type GenerateQuizCancelled = { ok: false; cancelled: true };
export type GenerateQuizSuccess = {
  ok: true;
  pages: Array<{
    type: TestType;
    title?: string | null;
    order_index: number;
    questions: Array<{
      question_title: string;
      explanation?: string | null;
      order_index: number;
      options: { option_text: string; is_correct: boolean; gap_index?: number }[];
    }>;
  }>;
  theoryBlocks?: Array<{
    type: TheoryBlockType;
    content: string;
    order_index: number;
  }>;
};
export type GenerateQuizError = { ok: false; error: string };
export type GenerateQuizResult = GenerateQuizSuccess | GenerateQuizError | GenerateQuizCancelled;

export function isGenerateCancelled(result: GenerateQuizResult): result is GenerateQuizCancelled {
  return !result.ok && "cancelled" in result && result.cancelled === true;
}

interface UseQuizAiGenerationOptions {
  initialTopic?: string;
  initialLevel?: string;
  initialLanguage?: "RU" | "EN";
  initialQuestionsPerPage?: number;
  initialType?: TestType;
}

export function useQuizAiGeneration(options: UseQuizAiGenerationOptions = {}) {
  const [topic, setTopic] = useState(options.initialTopic ?? "");
  const [level, setLevel] = useState(options.initialLevel ?? "B1");
  const [language, setLanguage] = useState<"RU" | "EN">(options.initialLanguage ?? "EN");
  const [questionsPerPage, setQuestionsPerPage] = useState<number>(options.initialQuestionsPerPage ?? 10);
  const [selectedType, setSelectedType] = useState<TestType>(options.initialType ?? "single");
  const [inputMode, setInputMode] = useState<InputMode>("gaps");
  const [style, setStyle] = useState("");
  const [constraints, setConstraints] = useState("");
  const [lexicon, setLexicon] = useState("");
  const [bannedTopics, setBannedTopics] = useState("");
  const [customTask, setCustomTask] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  function cancelGeneration() {
    abortControllerRef.current?.abort();
  }

  async function generate(nextTopic?: string): Promise<GenerateQuizResult> {
    const topicToUse = typeof nextTopic === "string" ? nextTopic : topic;
    const topicTrimmed = topicToUse.trim();
    if (!topicTrimmed) {
      setErrorMessage("Topic is required for generation.");
      return { ok: false, error: "Topic is required for generation." };
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const payload: GenerateQuizPagesParams = {
        topic: topicTrimmed,
        level: level.trim(),
        language,
        pageCount: 1,
        questionsPerPage: Number.isFinite(questionsPerPage)
          ? Math.max(1, Math.trunc(questionsPerPage))
          : 1,
        allowedTypes: [selectedType],
        inputMode: selectedType === "input" ? inputMode : undefined,
        customTask: customTask.trim() || undefined,
        style: style.trim() || undefined,
        constraints: constraints.trim() || undefined,
        lexicon: lexicon.trim() || undefined,
        bannedTopics: bannedTopics.trim() || undefined,
        model: selectedModel.trim() || undefined,
      };

      const response = await fetch("/admin/quiz-ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = errBody?.error ?? `Request failed (${response.status})`;
        setErrorMessage(message);
        return { ok: false, error: message };
      }

      const res = (await response.json()) as GenerateQuizResult;

      if (process.env.NODE_ENV === "development") {
        console.log("[Quiz AI] generateQuizPages response:", res);
      }

      if (isGenerateCancelled(res)) {
        return res;
      }

      if (!res.ok) {
        setErrorMessage(res.error);
      }
      return res;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return { ok: false, cancelled: true };
      }
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrorMessage(msg);
      return { ok: false, error: msg };
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
    }
  }

  return {
    // state
    topic,
    level,
    language,
    questionsPerPage,
    selectedType,
    inputMode,
    customTask,
    style,
    constraints,
    lexicon,
    bannedTopics,
    selectedModel,
    isGenerating,
    errorMessage,

    // setters
    setTopic,
    setLevel,
    setLanguage,
    setQuestionsPerPage,
    setSelectedType,
    setInputMode,
    setCustomTask,
    setStyle,
    setConstraints,
    setLexicon,
    setBannedTopics,
    setSelectedModel,
    setErrorMessage,

    // actions
    generate,
    cancelGeneration,
  };
}
