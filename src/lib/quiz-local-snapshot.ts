"use client";

import type { TheoryBlockInput } from "@/app/admin/actions";
import type { Chapter } from "@/lib/chapters";

export const QUIZ_LOCAL_SNAPSHOT_VERSION = 1;
export const CREATE_QUIZ_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CREATE_QUIZ_SNAPSHOT_KEY_PREFIX = "quiz-create-draft:";

export type QuizLocalSnapshotMode = "create" | "edit";

export type QuizLocalSnapshot<TFormValues> = {
  version: typeof QUIZ_LOCAL_SNAPSHOT_VERSION;
  mode: QuizLocalSnapshotMode;
  updatedAt: number;
  formValues: TFormValues;
  videoUrl: string;
  theoryBlocks: TheoryBlockInput[];
  chapter?: Chapter;
  quizId?: string;
};

type SnapshotMatch = {
  mode: QuizLocalSnapshotMode;
  chapter?: Chapter;
  quizId?: string;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getCreateQuizSnapshotKey(chapter: Chapter, topicSlug?: string): string {
  const base = `${CREATE_QUIZ_SNAPSHOT_KEY_PREFIX}${chapter}`;
  const slug = topicSlug?.trim();
  return slug ? `${base}:${slug}` : base;
}

export function getEditQuizSnapshotKey(quizId: string): string {
  return `quiz-edit-draft:${quizId}`;
}

export function readQuizLocalSnapshot<TFormValues>(
  key: string,
  match: SnapshotMatch
): QuizLocalSnapshot<TFormValues> | null {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error("Snapshot is not an object");
    if (parsed.version !== QUIZ_LOCAL_SNAPSHOT_VERSION) throw new Error("Unsupported snapshot version");
    if (parsed.mode !== match.mode) throw new Error("Snapshot mode mismatch");
    if (match.chapter && parsed.chapter !== match.chapter) throw new Error("Snapshot chapter mismatch");
    if (match.quizId && parsed.quizId !== match.quizId) throw new Error("Snapshot quiz mismatch");
    if (!isRecord(parsed.formValues)) throw new Error("Snapshot form values are missing");
    if (!Array.isArray(parsed.theoryBlocks)) throw new Error("Snapshot theory blocks are invalid");

    return parsed as QuizLocalSnapshot<TFormValues>;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeQuizLocalSnapshot<TFormValues>(
  key: string,
  snapshot: QuizLocalSnapshot<TFormValues>
): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(snapshot));
}

export function removeQuizLocalSnapshot(key: string): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(key);
}

export function removeStaleCreateQuizSnapshots(now = Date.now()): void {
  if (!canUseLocalStorage()) return;

  const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index)
  ).filter((key): key is string => !!key && key.startsWith(CREATE_QUIZ_SNAPSHOT_KEY_PREFIX));

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || typeof parsed.updatedAt !== "number") continue;
      if (now - parsed.updatedAt > CREATE_QUIZ_SNAPSHOT_MAX_AGE_MS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}
