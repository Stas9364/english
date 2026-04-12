import type { QuestionWithOptions } from './supabase';

/** Number of [[]] gaps in the question title. 0 if none. */
export function getGapCount(title: string): number {
    if (!title?.includes("[[]]")) return 0;
    return Math.max(0, title.split("[[]]").length - 1);
}

/** For input questions: stored answers length = Math.max(1, getGapCount). */
export function getEffectiveGapCount(title: string): number {
    return Math.max(1, getGapCount(title));
}

export function isTextAnswerCorrect(question: QuestionWithOptions, textAnswers: string[]): boolean {
    const gapCount = getEffectiveGapCount(question.question_title);
    const userArr = (textAnswers ?? []).slice(0, gapCount).map((s) => (s ?? "").trim().toLowerCase());
    if (userArr.length !== gapCount || userArr.some((s) => !s)) return false;
    const options = (question.options ?? []).filter((o) => (o.option_text ?? "").trim());
    return Array.from({ length: gapCount }, (_, i) => {
        const correctTexts = new Set(
            options.filter((o) => (o.gap_index ?? 0) === i).map((o) => o.option_text!.trim().toLowerCase())
        );
        return correctTexts.has(userArr[i] ?? "");
    }).every(Boolean);
}

/** For inline [[]] gaps: returns whether each gap's answer is correct (matches at least one option for that gap_index). */
export function getPerGapCorrectness(question: QuestionWithOptions, textAnswers: string[]): (boolean | null)[] {
    const gapCount = getEffectiveGapCount(question.question_title);
    const userArr = (textAnswers ?? []).slice(0, gapCount).map((s) => (s ?? "").trim().toLowerCase());
    const options = (question.options ?? []).filter((o) => (o.option_text ?? "").trim());
    return Array.from({ length: gapCount }, (_, i) => {
        const userVal = userArr[i] ?? "";
        if (!userVal) return null;
        const correctAtI = new Set(
            options.filter((o) => (o.gap_index ?? 0) === i).map((o) => o.option_text!.trim().toLowerCase())
        );
        return correctAtI.has(userVal);
    });
}

/** For select_gaps: returns whether each gap's selected option is correct. */
export function getPerGapCorrectnessSelectGaps(question: QuestionWithOptions, selectedOptionIds: string[]): (boolean | null)[] {
    const gapCount = getEffectiveGapCount(question.question_title);
    const optionById = new Map((question.options ?? []).map((o) => [o.id, o]));
    return Array.from({ length: gapCount }, (_, i) => {
        const optId = selectedOptionIds[i];
        if (!optId) return null;
        const opt = optionById.get(optId);
        return opt ? opt.is_correct : null;
    });
}

/** Returns accepted answer texts for each gap index.
 *  If onlyMarkedCorrect=true, include only options with is_correct=true.
 */
export function getCorrectTextsByGap(question: QuestionWithOptions, onlyMarkedCorrect = false): string[][] {
    const gapCount = getEffectiveGapCount(question.question_title);
    const options = question.options ?? [];
    return Array.from({ length: gapCount }, (_, i) => {
        const unique = new Set(
            options
                .filter(
                    (o) =>
                        (o.gap_index ?? 0) === i &&
                        (o.option_text ?? "").trim() &&
                        (!onlyMarkedCorrect || o.is_correct)
                )
                .map((o) => o.option_text!.trim())
        );
        return Array.from(unique);
    });
}


