"use server";

import { z } from "zod";
import type { TestType, TheoryBlockType } from "@/lib/supabase";

const GEMINI_MODEL = "gemma-3n-e4b-it";

export type GenerateQuizPagesParams = {
  topic: string;
  level: string;
  language?: "RU" | "EN";
  pageCount: number;
  questionsPerPage: number;
  allowedTypes: TestType[];
  style?: string;
  constraints?: string;
  lexicon?: string;
  bannedTopics?: string;
  customTask?: string;
};

type GeneratedOption = { option_text: string; is_correct: boolean; gap_index?: number };
type GeneratedQuestion = { question_title: string; explanation?: string | null; options?: GeneratedOption[] };
type GeneratedPage = { type: TestType; title?: string | null; questions: GeneratedQuestion[] };

type GeneratedPageForCreate = {
  type: TestType;
  title?: string | null;
  order_index: number;
  questions: {
    question_title: string;
    explanation?: string | null;
    order_index: number;
    options: { option_text: string; is_correct: boolean; gap_index?: number }[];
  }[];
};

type GeneratedTheoryBlockForCreate = {
  type: TheoryBlockType;
  content: string;
  order_index: number;
};

type GenerateOk = {
  ok: true;
  pages: GeneratedPageForCreate[];
  theoryBlocks?: GeneratedTheoryBlockForCreate[];
};

type GenerateErr = { ok: false; error: string };

type GenerateLogMeta = Record<string, unknown>;

function toSerializableError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { error };
}

function logGenerateError(requestId: string, stage: string, meta?: GenerateLogMeta): void {
  const payload = {
    tag: "generateQuizPages:error",
    requestId,
    stage,
    ts: new Date().toISOString(),
    ...(meta ?? {}),
  };
  try {
    // Vercel reliably indexes one-line stderr JSON payloads.
    console.error(JSON.stringify(payload));
  } catch {
    console.error("[generateQuizPages:error]", payload);
  }
}

const GeneratedDraftSchema = z.object({
  pages: z.array(
    z.object({
      type: z.enum(["single", "multiple", "input", "select_gaps", "matching"]),
      title: z.string().optional().nullable(),
      questions: z.array(
        z.object({
          question_title: z.string(),
          explanation: z.string().optional().nullable(),
          options: z
            .array(
              z.object({
                option_text: z.string(),
                is_correct: z.boolean(),
                gap_index: z.number().int().min(0).optional(),
              })
            )
            .optional(),
        })
      ),
    })
  ),
  theoryBlocks: z
    .array(
      z.object({
        type: z.enum(["text", "image"]),
        content: z.string(),
        order_index: z.number().int().min(0).optional(),
      })
    )
    .optional(),
});

function extractFirstJsonObject(text: string): string | null {
  const s = (text ?? "").trim();
  const firstBrace = s.indexOf("{");
  if (firstBrace === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(firstBrace, i + 1);
    }
  }
  return null;
}

function stripMarkdownCodeFences(text: string): string {
  const s = (text ?? "").trim();
  if (!s) return s;
  // Full fenced block: ```json ... ``` or ``` ... ```
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  // Tolerant mode: sometimes model sends only opening fence without closing.
  // Remove leading ```json / ``` and optional trailing ``` if present.
  let out = s.replace(/^```(?:json)?\s*/i, "");
  out = out.replace(/\s*```$/i, "");
  return out.trim();
}

function parseModelJson(text: string): unknown {
  const candidates: string[] = [];
  const trimmed = (text ?? "").trim();
  if (trimmed) candidates.push(trimmed);

  const unfenced = stripMarkdownCodeFences(trimmed);
  if (unfenced && unfenced !== trimmed) candidates.push(unfenced);

  for (const c of [...candidates]) {
    const extracted = extractFirstJsonObject(c);
    if (extracted && extracted !== c) candidates.push(extracted);
  }

  let lastError: unknown = null;
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    try {
      return JSON.parse(c);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Model did not return valid JSON");
}

function gapCountFromTitle(title: string): number {
  const count = Math.max(0, (title ?? "").split("[[]]").length - 1);
  return Math.max(1, count);
}

function isLikelyConnectedTextTask(customTask?: string): boolean {
  const text = (customTask ?? "").trim();
  if (!text) return false;
  const nonEmptyLines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const hasInlineNumberedGaps = /\d+\s*\([^)]*\/[^)]*\)/.test(text);
  const hasManyListLines = nonEmptyLines.length >= 6;
  return text.length >= 250 && hasInlineNumberedGaps && !hasManyListLines;
}

function buildInputQuestionTitleFromCustomTask(customTask?: string): string {
  const src = (customTask ?? "").replace(/\r\n/g, "\n").trim();
  if (!src) return "";
  // Convert "1(...)" / "2 (...)" markers into visible input gaps,
  // but keep the bracket hints "(may/never/know)" unchanged.
  return src.replace(/(^|\s)\d+\s*\(/g, "$1[[]] (");
}

function extractOrderedLineHints(customTask?: string): string[] {
  const text = (customTask ?? "").trim();
  if (!text) return [];
  const hints: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  for (const line of lines) {
    const m = line.match(/\/[^(]*\(([^)]+)\)/);
    const hint = (m?.[1] ?? "").toString().trim();
    if (hint) hints.push(hint);
  }
  return hints;
}

function extractGapHintsFromTitle(title: string): string[] {
  const hints: string[] = [];
  const re = /\[\[\]\]\s*\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title)) !== null) {
    const hint = (m[1] ?? "").toString().trim();
    hints.push(hint);
  }
  return hints;
}

function normalizeGeneratedDraft(
  draft: z.infer<typeof GeneratedDraftSchema>,
  opts?: { customTask?: string; forceSingleInputQuestion?: boolean }
): {
  pages: GeneratedPageForCreate[];
  theoryBlocks?: GeneratedTheoryBlockForCreate[];
} {
  const pages: GeneratedPageForCreate[] = [];
  const forceSingleInputQuestion =
    !!opts?.forceSingleInputQuestion || isLikelyConnectedTextTask(opts?.customTask);
  const orderedLineHints = extractOrderedLineHints(opts?.customTask);
  let inputHintCursor = 0;

  for (let pi = 0; pi < draft.pages.length; pi++) {
    const p = draft.pages[pi] as GeneratedPage;
    const type = p.type;
    const rawPageTitle = (p.title ?? "")?.toString().trim();
    let pageTitle = rawPageTitle;

    const questions: GeneratedPageForCreate["questions"] = [];
    let qs = Array.isArray(p.questions) ? p.questions : [];
    if (type === "input" && forceSingleInputQuestion && qs.length > 1) {
      const titleParts: string[] = [];
      if (rawPageTitle && rawPageTitle.includes("[[]]")) titleParts.push(rawPageTitle);
      for (const q of qs) {
        const qt = (q?.question_title ?? "").toString().trim();
        if (qt) titleParts.push(qt);
      }
      const mergedQuestionTitle = titleParts.join(" ").replace(/\s+/g, " ").trim();
      const mergedOptions = qs.flatMap((q) =>
        Array.isArray(q?.options)
          ? q.options.map((o) => ({
              option_text: (o?.option_text ?? "").toString(),
              is_correct: !!o?.is_correct,
              gap_index: Number.isFinite(o?.gap_index as number) ? (o?.gap_index as number) : undefined,
            }))
          : []
      );
      qs = [{ question_title: mergedQuestionTitle, explanation: null, options: mergedOptions }];
      // For connected custom text, keep exercise text inside the question and avoid duplicating it in page title.
      pageTitle = rawPageTitle && !rawPageTitle.includes("[[]]") ? rawPageTitle : "";
    }
    if (type === "input" && forceSingleInputQuestion) {
      const canonical = buildInputQuestionTitleFromCustomTask(opts?.customTask);
      if (canonical) {
        if (qs.length === 0) {
          qs = [{ question_title: canonical, explanation: null, options: [] }];
        } else {
          qs[0] = { ...qs[0], question_title: canonical };
        }
        if (qs.length > 1) qs = [qs[0]];
        pageTitle = "";
      }
    }

    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi] as GeneratedQuestion;
      let question_title = (q.question_title ?? "").toString().trim();
      if (!question_title) continue;
      if (type === "input" && !forceSingleInputQuestion && !/\([^)]*\)/.test(question_title)) {
        const hint = orderedLineHints[inputHintCursor] ?? "";
        if (hint) {
          question_title = question_title.includes("[[]]")
            ? question_title.replace("[[]]", `[[]] (${hint})`)
            : `${question_title} (${hint})`;
        }
      }
      if (type === "input") inputHintCursor++;

      const explanation = (q.explanation ?? "")?.toString().trim();

      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const optionsTrimmed = rawOptions
        .map((o) => ({
          option_text: (o.option_text ?? "").toString().trim(),
          is_correct: !!o.is_correct,
          gap_index: Number.isFinite(o.gap_index as number) ? Math.max(0, Math.trunc(o.gap_index as number)) : undefined,
        }))
        .filter((o) => o.option_text.length > 0);

      const isInput = type === "input";
      const isSelectGaps = type === "select_gaps";
      const isGapBased = isInput || isSelectGaps;

      let normalizedOptions: { option_text: string; is_correct: boolean; gap_index?: number }[] = [];

      if (isGapBased) {
        const gaps = gapCountFromTitle(question_title);
        const gapHints = isInput ? extractGapHintsFromTitle(question_title) : [];
        const byGap = new Map<number, { option_text: string; is_correct: boolean; gap_index?: number }[]>();
        for (let g = 0; g < gaps; g++) byGap.set(g, []);
        const noGapIndexOptions: { option_text: string; is_correct: boolean; gap_index?: number }[] = [];
        const outOfRangeGapOptions: { option_text: string; is_correct: boolean; gap_index?: number }[] = [];
        for (const o of optionsTrimmed) {
          if (o.gap_index === undefined) {
            noGapIndexOptions.push(o);
            continue;
          }
          const gi = o.gap_index;
          if (!byGap.has(gi)) {
            if (isInput) outOfRangeGapOptions.push(o);
            continue;
          }
          byGap.get(gi)!.push({ option_text: o.option_text, is_correct: isInput ? true : o.is_correct, gap_index: gi });
        }

        // Gemini sometimes omits gap_index for input answers; distribute those answers
        // to missing gaps first so validation can still succeed for well-formed content.
        if (isInput && (noGapIndexOptions.length > 0 || outOfRangeGapOptions.length > 0)) {
          const recoverableOptions = [...noGapIndexOptions, ...outOfRangeGapOptions];
          let cursor = 0;
          for (let g = 0; g < gaps && cursor < recoverableOptions.length; g++) {
            const list = byGap.get(g) ?? [];
            if (list.length > 0) continue;
            const o = recoverableOptions[cursor++];
            list.push({ option_text: o.option_text, is_correct: true, gap_index: g });
            byGap.set(g, list);
          }
          while (cursor < recoverableOptions.length) {
            const o = recoverableOptions[cursor++];
            const list0 = byGap.get(0) ?? [];
            list0.push({ option_text: o.option_text, is_correct: true, gap_index: 0 });
            byGap.set(0, list0);
          }
        } else {
          for (const o of noGapIndexOptions) {
            const gi = 0;
            if (!byGap.has(gi)) continue;
            byGap.get(gi)!.push({ option_text: o.option_text, is_correct: isInput ? true : o.is_correct, gap_index: gi });
          }
        }
        for (let g = 0; g < gaps; g++) {
          const list = byGap.get(g) ?? [];
          if (isInput && list.length === 0 && forceSingleInputQuestion) {
            const hint = (gapHints[g] ?? "").trim();
            const fallback = hint || "answer";
            list.push({ option_text: fallback, is_correct: true, gap_index: g });
            byGap.set(g, list);
          }
          if (list.length === 0) {
            throw new Error(
              type === "input"
                ? `Missing at least one correct answer for gap ${g + 1}`
                : `Missing at least one answer option for gap ${g + 1}`
            );
          }
          if (isSelectGaps && !list.some((x) => x.is_correct)) {
            throw new Error(`Mark at least one correct answer for gap ${g + 1}`);
          }
          normalizedOptions.push(...list);
        }
      } else {
        if (optionsTrimmed.length === 0) {
          throw new Error("Choice page must have at least one option per question");
        }
        normalizedOptions = optionsTrimmed.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct }));
      }

      questions.push({
        question_title,
        explanation: explanation || null,
        order_index: questions.length,
        options: normalizedOptions,
      });
    }

    if (questions.length === 0) continue;

    pages.push({
      type,
      title: pageTitle ? pageTitle : null,
      order_index: pages.length,
      questions,
    });
  }

  if (pages.length === 0) {
    throw new Error("Model returned no valid pages/questions");
  }

  const theoryBlocks = (draft.theoryBlocks ?? [])
    .map((b, i) => ({
      type: b.type as TheoryBlockType,
      content: (b.content ?? "").toString().trim() || " ",
      order_index: i,
    }))
    .filter((b) => !!b.content);

  return { pages, ...(theoryBlocks.length ? { theoryBlocks } : {}) };
}

function buildGeneratePrompt(params: GenerateQuizPagesParams): string {
  const allowed = params.allowedTypes.join(", ");
  const lang = params.language ?? "EN";
  const level = params.level.trim() || "B1";
  const style = (params.style ?? "").trim();
  const constraints = (params.constraints ?? "").trim();
  const lexicon = (params.lexicon ?? "").trim();
  const banned = (params.bannedTopics ?? "").trim();
  const customTask = (params.customTask ?? "").trim();
  const singleType = params.allowedTypes.length === 1 ? params.allowedTypes[0] : null;

  return [
    `You are generating quiz pages for an English-learning app.`,
    `Return ONLY valid JSON. No markdown. No extra text.`,
    ``,
    `Output schema:`,
    `{`,
    `  "pages": [`,
    `    {`,
    `      "type": "single" | "multiple" | "input" | "select_gaps" | "matching",`,
    `      "title": string | null,`,
    `      "questions": [`,
    `        {`,
    `          "question_title": string,`,
    `          "explanation": string | null,`,
    `          "options": [ { "option_text": string, "is_correct": boolean, "gap_index"?: number } ]`,
    `        }`,
    `      ]`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules:`,
    `- CRITICAL PAGE RULE: return EXACTLY ${params.pageCount} item(s) in "pages" array. Do not return more, do not return less.`,
    params.pageCount === 1
      ? `- For this request, "pages" must contain exactly ONE object. Even if the instruction has many exercises/items, keep them as multiple questions inside that single page.`
      : null,
    `- "type" must be one of: ${allowed}`,
    singleType ? `- In this request ALL pages MUST have type = "${singleType}". Do not use any other page types.` : null,
    customTask
      ? `- Do NOT create more questions than are explicitly present or requested in the instruction. If the instruction contains N questions/examples, keep exactly those (you may split or restructure them to fit the schema, but do not invent extra questions). Ignore any default questions-per-page limits if they conflict with the instruction.`
      : `- Create exactly ${params.pageCount} pages, each with exactly ${params.questionsPerPage} questions.`,
    customTask
      ? `- SLASH PRESERVATION RULE: if the instruction contains fragments separated by "/" (e.g. "he / look", "I / make"), treat BOTH sides as required source material. Do NOT drop, omit, or replace either side; keep both parts represented in the generated question.`
      : null,
    customTask
      ? `- CONNECTED TEXT RULE: if the instruction provides one continuous/coherent text block (paragraph), keep it as ONE question in the quiz. Do NOT split it into multiple questions or break it into sentence-level items unless the instruction explicitly asks for that split.`
      : null,
    `- question_title must be concise and must NOT contain HTML.`,
    `- GLOBAL GAP RULE: whenever you use "[[]]" in question_title (for ANY page type), brackets must stay EMPTY. Never put any word, answer, hint, translation, or placeholder text inside them. Correct: "[[]]". Incorrect: "[[goes]]", "[[answer]]", "[[...]]".`,
    `- For type "single": options length 3-5, exactly one is_correct=true.`,
    `- For type "multiple": options length 4-7, at least one is_correct=true.`,
    `- For type "matching": each question is one row (left column); options are the draggable answers (right column). Each question must have exactly one option with is_correct=true (its correct pair). Give each question enough CONTEXT so the learner can tell which answer fits: use a short sentence or phrase (e.g. "He ___ at the office" or "My sister ___ the guitar") rather than a single word. The context must make the correct match obvious. CRITICAL: avoid ambiguity — each correct answer must belong to exactly one question; ensure every question has a unique correct match so the task has a single correct solution. Keep options short.`,
    `- For type "input":`,
    `  - question_title must include one or more "[[]]" gaps; each gap is the place where the learner types the answer;`,
    `  - EACH gap must correspond to a VERB in INFINITIVE form shown in round brackets inside the sentence, e.g. "Next week the sports centre [[]] (close) for three days.";`,
    `  - options are accepted correct forms of that verb in context; set gap_index (0-based); is_correct must be true for all options; NEVER return distractors/incorrect options for input tasks.`,
    `  - If a question has N gaps, you MUST provide at least one option for every gap_index from 0..N-1. Missing gap_index is invalid.`,
    customTask
      ? `  - For custom connected text, preserve the original text almost verbatim: only replace numbered markers like "1(...)" with "[[]] (...)" and keep the text inside round brackets exactly as provided (do NOT delete, shorten, or rewrite bracket content).`
      : null,
    `- For type "select_gaps": question_title must include one or more "[[]]" gaps. options are choices; set gap_index (0-based). For each gap, provide 3-5 options and at least one is_correct=true.`,
    `- If there are N gaps in the title, you MUST provide at least one option for each gap_index from 0..N-1.`,
    ``,
    customTask
      ? `Primary instruction (VERBATIM, highest priority): ${customTask}`
      : null,
    customTask
      ? `You MUST convert this exact instruction into quiz pages that follow the JSON schema and rules above. Treat the text of the exercise as CANONICAL: do NOT paraphrase, rewrite, or change wording unless absolutely necessary to fit the schema (e.g. splitting into question_title and options). DO NOT invent new content that is not implied by the instruction. If there is any conflict between the instruction and other requirements (topic, CEFR level, etc.), prefer the instruction for CONTENT, but ALWAYS obey the STRUCTURE: pageCount = ${params.pageCount}, questionsPerPage = ${params.questionsPerPage}${singleType ? `, and all pages must have type = "${singleType}".` : "."
      }`
      : null,
    ``,
    `Content requirements:`,
    `- Topic: ${params.topic}`,
    `- CEFR level: ${level}`,
    `- UI language for explanations: ${lang} (question_title and options stay in English unless the topic requires otherwise).`,
    style ? `- Style: ${style}` : null,
    constraints ? `- Constraints: ${constraints}` : null,
    lexicon ? `- Must include lexicon: ${lexicon}` : null,
    banned ? `- Avoid topics: ${banned}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateQuizPages(
  params: GenerateQuizPagesParams
): Promise<GenerateOk | GenerateErr> {
  const requestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const MAX_PAGES = 20;
  const MAX_QUESTIONS_PER_PAGE = 20;
  const MAX_TOTAL_QUESTIONS = 200;
  const MAX_FIELD_LEN_TOPIC = 200;
  const MAX_FIELD_LEN_GENERIC = 2000;

  const trimOrUndef = (v: unknown): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
  };

  const ParamsSchema = z
    .object({
      topic: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s.length > 0, "Topic is required")
        .refine((s) => s.length <= MAX_FIELD_LEN_TOPIC, `Topic is too long (max ${MAX_FIELD_LEN_TOPIC})`),
      level: z.string().default("B1").transform((s) => (s ?? "").trim() || "B1"),
      language: z.enum(["RU", "EN"]).optional(),
      pageCount: z.number().int().min(1).max(MAX_PAGES),
      questionsPerPage: z.number().int().min(1).max(MAX_QUESTIONS_PER_PAGE),
      customTask: z
        .string()
        .optional()
        .transform(trimOrUndef),
      allowedTypes: z
        .array(z.enum(["single", "multiple", "input", "select_gaps", "matching"]))
        .min(1)
        .max(5),
      style: z.string().optional().transform(trimOrUndef).refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Style is too long (max ${MAX_FIELD_LEN_GENERIC})`),
      constraints: z
        .string()
        .optional()
        .transform(trimOrUndef)
        .refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Constraints is too long (max ${MAX_FIELD_LEN_GENERIC})`),
      lexicon: z.string().optional().transform(trimOrUndef).refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Lexicon is too long (max ${MAX_FIELD_LEN_GENERIC})`),
      bannedTopics: z
        .string()
        .optional()
        .transform(trimOrUndef)
        .refine((s) => !s || s.length <= MAX_FIELD_LEN_GENERIC, `Banned topics is too long (max ${MAX_FIELD_LEN_GENERIC})`),
    })
    .superRefine((p, ctx) => {
      const total = p.pageCount * p.questionsPerPage;
      if (total > MAX_TOTAL_QUESTIONS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Too many questions requested (${total}). Max is ${MAX_TOTAL_QUESTIONS}.`,
          path: ["questionsPerPage"],
        });
      }
    });

  let parsedParams: GenerateQuizPagesParams;
  try {
    parsedParams = {
      ...ParamsSchema.parse(params),
      pageCount: 1,
    };
  } catch (e) {
    logGenerateError(requestId, "params_validation", {
      paramsPreview: {
        topic: typeof params?.topic === "string" ? params.topic.slice(0, 200) : undefined,
        level: typeof params?.level === "string" ? params.level : undefined,
        language: params?.language,
        pageCount: params?.pageCount,
        questionsPerPage: params?.questionsPerPage,
        allowedTypes: params?.allowedTypes,
      },
      error: toSerializableError(e),
    });
    if (e instanceof z.ZodError) {
      const first = e.issues?.[0];
      return { ok: false, error: first?.message ?? "Invalid generation parameters" };
    }
    return { ok: false, error: "Invalid generation parameters" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logGenerateError(requestId, "missing_api_key");
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
  }

  const prompt = buildGeneratePrompt(parsedParams);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    // const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
    const signal =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (AbortSignal as any).timeout(45_000)
        : undefined;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!resp.ok) {
      logGenerateError(requestId, "gemini_http_error", { status: resp.status });
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, error: "Gemini authorization failed. Check GEMINI_API_KEY." };
      }
      if (resp.status === 429) {
        return { ok: false, error: "Gemini rate limit exceeded. Try again later." };
      }
      return { ok: false, error: `Gemini request failed (${resp.status}). Try again later.` };
    }

    type GeminiPart = { text?: string };
    type GeminiResponse = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
    const json = (await resp.json()) as GeminiResponse;
    const textParts: string[] =
      json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => (typeof p?.text === "string" ? p.text : "")).filter(Boolean) ??
      [];
    const text = textParts.join("\n").trim();
    let draftUnknown: unknown;
    try {
      draftUnknown = parseModelJson(text);
    } catch (e) {
      logGenerateError(requestId, "json_parse", {
        responsePreview: text.slice(0, 1200),
        error: toSerializableError(e),
      });
      return { ok: false, error: "Model did not return valid JSON" };
    }

    let draft: z.infer<typeof GeneratedDraftSchema>;
    try {
      draft = GeneratedDraftSchema.parse(draftUnknown);
    } catch (e) {
      logGenerateError(requestId, "draft_schema_parse", {
        draftPreview:
          draftUnknown && typeof draftUnknown === "object"
            ? JSON.stringify(draftUnknown).slice(0, 2000)
            : draftUnknown,
        error: toSerializableError(e),
      });
      throw e;
    }
    const allowed = new Set(parsedParams.allowedTypes);
    const hasCustomTask = !!(parsedParams.customTask && parsedParams.customTask.trim().length > 0);
    if (draft.pages.length !== parsedParams.pageCount) {
      logGenerateError(requestId, "page_count_mismatch", {
        returnedPageCount: draft.pages.length,
        expectedPageCount: parsedParams.pageCount,
      });
      return { ok: false, error: `Model returned ${draft.pages.length} pages, expected ${parsedParams.pageCount}` };
    }
    for (let i = 0; i < draft.pages.length; i++) {
      const p = draft.pages[i];
      if (!allowed.has(p.type as TestType)) {
        logGenerateError(requestId, "disallowed_page_type", {
          pageIndex: i,
          pageType: p.type,
          allowedTypes: parsedParams.allowedTypes,
        });
        return { ok: false, error: `Model returned disallowed page type: ${p.type}` };
      }
      if (!hasCustomTask && p.questions.length !== parsedParams.questionsPerPage) {
        logGenerateError(requestId, "question_count_mismatch", {
          pageIndex: i,
          returnedQuestionCount: p.questions.length,
          expectedQuestionCount: parsedParams.questionsPerPage,
          pageType: p.type,
          pageTitle: p.title,
        });
        return {
          ok: false,
          error: `Model returned ${p.questions.length} questions on page ${i + 1}, expected ${parsedParams.questionsPerPage}`,
        };
      }
    }
    let normalized: ReturnType<typeof normalizeGeneratedDraft>;
    try {
      normalized = normalizeGeneratedDraft(draft, {
        customTask: parsedParams.customTask,
        forceSingleInputQuestion:
          hasCustomTask &&
          parsedParams.allowedTypes.includes("input") &&
          isLikelyConnectedTextTask(parsedParams.customTask),
      });
    } catch (e) {
      logGenerateError(requestId, "normalize_generated_draft", {
        topic: parsedParams.topic,
        level: parsedParams.level,
        language: parsedParams.language ?? "EN",
        allowedTypes: parsedParams.allowedTypes,
        pageCount: parsedParams.pageCount,
        questionsPerPage: parsedParams.questionsPerPage,
        pagesPreview: draft.pages.slice(0, 2),
        error: toSerializableError(e),
      });
      throw e;
    }
    return { ok: true, pages: normalized.pages, ...(normalized.theoryBlocks ? { theoryBlocks: normalized.theoryBlocks } : {}) };
  } catch (e) {
    logGenerateError(requestId, "generate_quiz_pages_catch", {
      topic: params.topic,
      level: params.level,
      language: params.language ?? "EN",
      allowedTypes: params.allowedTypes,
      pageCount: params.pageCount,
      questionsPerPage: params.questionsPerPage,
      error: toSerializableError(e),
    });
    if (e instanceof z.ZodError) {
      return { ok: false, error: "Model returned JSON in an unexpected format" };
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    if (/abort/i.test(message) || /timeout/i.test(message)) {
      return { ok: false, error: "Gemini request timed out. Try again." };
    }
    return { ok: false, error: message || "Unknown error" };
  }
}

