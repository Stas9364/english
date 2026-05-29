export type CrosswordProgressSnapshot = {
  version: 1;
  quizId: string;
  updatedAt: number;
  answers: Record<string, string>;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getCrosswordProgressKey(quizId: string): string {
  return `crossword-progress:${quizId}`;
}

export function readCrosswordProgress(quizId: string): CrosswordProgressSnapshot | null {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(getCrosswordProgressKey(quizId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CrosswordProgressSnapshot>;
    if (parsed.version !== 1 || parsed.quizId !== quizId || !parsed.answers) {
      throw new Error("Invalid crossword progress");
    }
    return parsed as CrosswordProgressSnapshot;
  } catch {
    window.localStorage.removeItem(getCrosswordProgressKey(quizId));
    return null;
  }
}

export function writeCrosswordProgress(quizId: string, answers: Record<string, string>): void {
  if (!canUseLocalStorage()) return;

  const snapshot: CrosswordProgressSnapshot = {
    version: 1,
    quizId,
    updatedAt: Date.now(),
    answers,
  };
  window.localStorage.setItem(getCrosswordProgressKey(quizId), JSON.stringify(snapshot));
}

export function removeCrosswordProgress(quizId: string): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(getCrosswordProgressKey(quizId));
}
