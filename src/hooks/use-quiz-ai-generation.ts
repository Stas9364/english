"use client";

import { useState } from "react";
import { generateQuizPages } from "@/app/admin/actions";
import type { TestType } from "@/lib/supabase";

export type GenerateQuizResult = Awaited<ReturnType<typeof generateQuizPages>>;
export type GenerateQuizSuccess = Extract<GenerateQuizResult, { ok: true }>;

interface UseQuizAiGenerationOptions {
  initialTopic?: string;
  initialLevel?: string;
  initialLanguage?: "RU" | "EN";
  initialQuestionsPerPage?: number;
  initialType?: TestType;
}

interface GenerateOptions {
  topicFallback?: string;
}

export function useQuizAiGeneration(options: UseQuizAiGenerationOptions = {}) {
  const [topic, setTopic] = useState(options.initialTopic ?? "");
  const [level, setLevel] = useState(options.initialLevel ?? "");
  const [language, setLanguage] = useState<"RU" | "EN">(options.initialLanguage ?? "EN");
  const [questionsPerPage, setQuestionsPerPage] = useState<number>(options.initialQuestionsPerPage ?? 5);
  const [selectedType, setSelectedType] = useState<TestType>(options.initialType ?? "single");
  const [style, setStyle] = useState("");
  const [constraints, setConstraints] = useState("");
  const [lexicon, setLexicon] = useState("");
  const [bannedTopics, setBannedTopics] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function generate(opts: GenerateOptions = {}): Promise<GenerateQuizResult> {
    const effectiveTopic =
      topic.trim() || (opts.topicFallback ?? "").trim() || "English quiz";

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const res = await generateQuizPages({
        topic: effectiveTopic,
        level: level.trim() || undefined,
        language,
        pageCount: 1,
        questionsPerPage: Number.isFinite(questionsPerPage)
          ? Math.max(1, Math.trunc(questionsPerPage))
          : 1,
        // Пока генерируем только один тип страницы за запрос.
        allowedTypes: [selectedType],
        style: style.trim() || undefined,
        constraints: constraints.trim() || undefined,
        lexicon: lexicon.trim() || undefined,
        bannedTopics: bannedTopics.trim() || undefined,
      });

      if (!res.ok) {
        setErrorMessage(res.error);
      }
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrorMessage(msg);
      return { ok: false, error: msg };
    } finally {
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
    style,
    constraints,
    lexicon,
    bannedTopics,
    isGenerating,
    errorMessage,

    // setters
    setTopic,
    setLevel,
    setLanguage,
    setQuestionsPerPage,
    setSelectedType,
    setStyle,
    setConstraints,
    setLexicon,
    setBannedTopics,
    setErrorMessage,

    // actions
    generate,
  };
}

