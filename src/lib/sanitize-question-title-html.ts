import DOMPurify from "isomorphic-dompurify";

/** Теги, которые может дать `react-simple-wysiwyg` (DefaultEditor + formatBlock). */
const ALLOWED_TAGS = [
  "a",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "p",
  "br",
  "div",
  "span",
  "h1",
  "h2",
  "pre",
] as const;

const ALLOWED_ATTR = ["href", "title", "target", "rel"] as const;

/**
 * Санитизация фрагмента заголовка вопроса перед `dangerouslySetInnerHTML`.
 * Whitelist совпадает с возможностями редактора по сути (без script/style/on*).
 */
export function sanitizeQuestionTitleHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
  });
}
