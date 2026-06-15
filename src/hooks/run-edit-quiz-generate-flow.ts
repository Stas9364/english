import type { TheoryBlockInput } from "@/app/admin/actions";
import { defaultPage } from "@/hooks/edit-quiz-page-defaults";
import {
  isGenerateCancelled,
  type GenerateQuizResult,
  type GenerateQuizSuccess,
} from "@/hooks/use-quiz-ai-generation";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";

type GenerateOk = GenerateQuizSuccess;
type EditQuizPageValue = EditQuizFormValues["pages"][number];

interface GenerateFlowParams {
  topicOverride: string;
  isListeningChapter: boolean;
  ai: {
    setTopic: (value: string) => void;
    generate: (nextTopic?: string) => Promise<GenerateQuizResult>;
  };
  getCurrentPages: () => EditQuizFormValues["pages"];
  replacePages: (pages: EditQuizFormValues["pages"]) => void;
  setActivePageIndex: (index: number) => void;
  appendTheoryBlocks: (blocks: TheoryBlockInput[]) => void;
  setGeneratedDraft: (draft: GenerateOk | null) => void;
}

export async function runEditQuizGenerateFlow({
  topicOverride,
  isListeningChapter,
  ai,
  getCurrentPages,
  replacePages,
  setActivePageIndex,
  appendTheoryBlocks,
  setGeneratedDraft,
}: GenerateFlowParams) {
  ai.setTopic(topicOverride);
  setGeneratedDraft(null);
  const res = await ai.generate(topicOverride);
  if (isGenerateCancelled(res)) return;
  if (!res.ok) return;

  if (res.pages?.length) {
    const currentPages = getCurrentPages();
    const generatedPages = res.pages.map((p, i) =>
      defaultPage(
        {
          type: isListeningChapter ? "input" : p.type,
          title: p.title ?? null,
          questions: p.questions.map((q) => ({
            question_title: q.question_title,
            question_image_url: null,
            explanation: q.explanation ?? null,
            options: q.options.map((o) => ({
              option_text: o.option_text,
              is_correct: o.is_correct,
              gap_index: o.gap_index ?? 0,
            })),
          })),
        },
        currentPages.length + i,
        isListeningChapter ? "input" : undefined
      )
    );

    const mergedPages: EditQuizPageValue[] = [
      ...currentPages.map((page, i) => ({ ...page, order_index: i })),
      ...generatedPages.map((page, i) => ({ ...page, order_index: currentPages.length + i })),
    ];
    replacePages(mergedPages);
    setActivePageIndex(mergedPages.length - 1);
  }

  if (res.theoryBlocks?.length) {
    appendTheoryBlocks(res.theoryBlocks);
  }
  setGeneratedDraft(res as GenerateOk);
}
