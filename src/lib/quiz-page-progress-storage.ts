export type QuizPageProgressSnapshot = {
  version: 1;
  quizId: string;
  pageId: string;
  updatedAt: number;
  selected: Record<string, string[]>;
  textAnswers: Record<string, string[]>;
};

export type QuizPageProgressData = Pick<QuizPageProgressSnapshot, "selected" | "textAnswers">;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((entry) => Array.isArray(entry) && entry.every((item) => typeof item === "string"));
}

export function getQuizPageProgressKey(quizId: string, pageId: string): string {
  return `quiz-page-progress:${quizId}:${pageId}`;
}

export function pickPageAnswers(
  questionIds: string[],
  selected: Record<string, string[]>,
  textAnswers: Record<string, string[]>
): QuizPageProgressData {
  const idSet = new Set(questionIds);
  const nextSelected: Record<string, string[]> = {};
  const nextTextAnswers: Record<string, string[]> = {};

  for (const id of idSet) {
    const selectedAnswers = selected[id];
    if (selectedAnswers?.some((value) => value.length > 0)) {
      nextSelected[id] = selectedAnswers;
    }

    const textValues = textAnswers[id];
    if (textValues?.some((value) => value.trim().length > 0)) {
      nextTextAnswers[id] = textValues;
    }
  }

  return { selected: nextSelected, textAnswers: nextTextAnswers };
}

export function isQuizPageProgressEmpty(data: QuizPageProgressData): boolean {
  return Object.keys(data.selected).length === 0 && Object.keys(data.textAnswers).length === 0;
}

export function readQuizPageProgress(quizId: string, pageId: string): QuizPageProgressSnapshot | null {
  if (!canUseLocalStorage()) return null;

  const key = getQuizPageProgressKey(quizId, pageId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<QuizPageProgressSnapshot>;
    if (
      parsed.version !== 1 ||
      parsed.quizId !== quizId ||
      parsed.pageId !== pageId ||
      !isStringArrayRecord(parsed.selected) ||
      !isStringArrayRecord(parsed.textAnswers)
    ) {
      throw new Error("Invalid quiz page progress");
    }
    return parsed as QuizPageProgressSnapshot;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeQuizPageProgress(quizId: string, pageId: string, data: QuizPageProgressData): void {
  if (!canUseLocalStorage()) return;

  const key = getQuizPageProgressKey(quizId, pageId);
  if (isQuizPageProgressEmpty(data)) {
    window.localStorage.removeItem(key);
    return;
  }

  const snapshot: QuizPageProgressSnapshot = {
    version: 1,
    quizId,
    pageId,
    updatedAt: Date.now(),
    selected: data.selected,
    textAnswers: data.textAnswers,
  };
  window.localStorage.setItem(key, JSON.stringify(snapshot));
}

export function removeQuizPageProgress(quizId: string, pageId: string): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(getQuizPageProgressKey(quizId, pageId));
}
