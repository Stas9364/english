/** Допустимые ключи раздела админки (совпадают с сегментом URL и `topics.chapter`) */
export const CHAPTERS = ["grammar", "vocabulary"] as const;

export type Chapter = (typeof CHAPTERS)[number];

export function isChapter(value: string): value is Chapter {
    return (CHAPTERS as readonly string[]).includes(value);
}

/** Подписи для ссылок и UI (при необходимости расширять) */
export const CHAPTER_LABELS: Record<Chapter, string> = {
    grammar: "Grammar",
    vocabulary: "Vocabulary",
};
