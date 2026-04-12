import { sanitizeQuestionTitleHtml } from '@/lib/sanitize-question-title-html';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

/**
 * Текст между `[[]]` (после санитизации).
 * `display: contents` — участок не создаёт узкий `inline-block`, текст переносится
 * по ширине родителя; `<p>` из редактора переводим в inline, чтобы не рвать строку с пропусками.
 */
export function GapTitleSegment({ part }: { part: string }) {
    const safe = useMemo(() => sanitizeQuestionTitleHtml(part), [part]);
    if (!safe) return <span className="inline" />;
    return (
      <p
        className={cn(
          "contents text-left",
          "[&_a]:text-primary [&_a]:wrap-break-word [&_a]:underline",
          "[&_p]:m-0 [&_p]:inline [&_p]:max-w-none",
          "[&_h1]:m-0 [&_h1]:inline [&_h1]:text-lg [&_h1]:font-semibold",
          "[&_h2]:m-0 [&_h2]:inline [&_h2]:text-base [&_h2]:font-semibold",
          "[&_pre]:m-0 [&_pre]:inline [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:align-baseline",
          "[&_ul]:my-0 [&_ul]:inline-block [&_ul]:max-w-full [&_ul]:align-baseline [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-0 [&_ol]:inline-block [&_ol]:max-w-full [&_ol]:align-baseline [&_ol]:list-decimal [&_ol]:pl-5"
        )}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }