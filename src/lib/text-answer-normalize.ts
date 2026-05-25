/**
 * Normalizes punctuation/whitespace for input-quiz answer matching.
 * Does not change letter case — use normalizeInputAnswerForCompare for checks.
 */
export function normalizeInputAnswerChars(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u2032\u02BC\uFF07]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB\u2033\uFF02]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Removes trailing sentence periods so "answer" matches "answer." */
function stripTrailingPeriods(text: string): string {
  return text.replace(/\.+$/, "");
}

/** Canonical form for comparing learner input with stored acceptable answers. */
export function normalizeInputAnswerForCompare(text: string): string {
  return stripTrailingPeriods(normalizeInputAnswerChars(text).toLowerCase());
}
