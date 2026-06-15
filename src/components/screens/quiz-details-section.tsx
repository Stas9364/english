"use client";

import { useFormContext } from "react-hook-form";
import { QuizMetaFields } from "@/components/quiz-meta-fields";
import { QuizAiGenerationBlock } from "@/components/quiz-ai-generation-block/quiz-ai-generation-block";
import { QuizPagesTabStrip } from "@/components/page-block/quiz-pages-tab-strip";
import { PageBlock } from "@/components/page-block/page-block";
import type { PageBlockFormValues } from "@/components/page-block/page-block";
import { Label } from "@/components/ui/label";
import type { TestType } from "@/lib/supabase";
import type { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";

type QuizDetailsFormValues = {
  topic_id: string;
  title: string;
  description: string;
  pages: PageBlockFormValues["pages"];
};

interface QuizPagesController<TPage> {
  fields: Array<{ id: string; title?: string | null }>;
  append: (value: TPage) => void;
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
}

interface QuizDetailsSectionProps<TPage> {
  topics: { id: string; name: string }[];
  selectedTopicId: string;
  isListeningChapter: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  ai: ReturnType<typeof useQuizAiGeneration>;
  onGenerate: (topicOverride: string) => Promise<void>;
  generatedSummary: string | null;
  generationError: string | null;
  pagesController: QuizPagesController<TPage>;
  activePageIndex: number;
  onActivePageIndexChange: (index: number) => void;
  defaultPage: (pageIndex: number) => TPage;
  defaultOption: () => { id?: string; option_text: string; is_correct: boolean; gap_index?: number };
  defaultQuestion: (orderIndex: number, pageType?: TestType) => PageBlockFormValues["pages"][number]["questions"][number];
  crosswordOptions: CrosswordSelectOption[];
  quizId?: string;
  onDeletePage: (pageIndex: number) => Promise<void> | void;
  onConfirmDeleteQuestion?: (pageIndex: number, questionIndex: number) => Promise<boolean>;
  onConfirmDeleteOption?: (pageIndex: number, questionIndex: number, optionIndex: number) => Promise<boolean>;
  onConfirmRemoveQuestionImage?: (pageIndex: number, questionIndex: number) => Promise<boolean>;
  sanitizeTitlePasteWhenEmpty?: boolean;
}

export function QuizDetailsSection<TPage>({
  topics,
  selectedTopicId,
  isListeningChapter,
  videoUrl,
  onVideoUrlChange,
  ai,
  onGenerate,
  generatedSummary,
  generationError,
  pagesController,
  activePageIndex,
  onActivePageIndexChange,
  defaultPage,
  defaultOption,
  defaultQuestion,
  crosswordOptions,
  quizId,
  onDeletePage,
  onConfirmDeleteQuestion,
  onConfirmDeleteOption,
  onConfirmRemoveQuestionImage,
  sanitizeTitlePasteWhenEmpty = false,
}: QuizDetailsSectionProps<TPage>) {
  const form = useFormContext<QuizDetailsFormValues>();
  const activePage = pagesController.fields[activePageIndex];

  return (
    <>
      <QuizMetaFields
        selectedTopicId={selectedTopicId}
        onTopicChange={(value) => form.setValue("topic_id", value, { shouldValidate: true })}
        topics={topics}
        topicError={form.formState.errors.topic_id?.message}
        titleInputProps={form.register("title")}
        titleError={form.formState.errors.title?.message}
        descriptionInputProps={form.register("description")}
        isListeningChapter={isListeningChapter}
        videoUrl={videoUrl}
        onVideoUrlChange={onVideoUrlChange}
      />

      {!isListeningChapter && (
        <QuizAiGenerationBlock
          ai={ai}
          onGenerate={onGenerate}
          generatedSummary={generatedSummary}
          errorMessage={generationError}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label>Pages</Label>
          <span className="text-sm text-muted-foreground">Pages: {pagesController.fields.length}</span>
        </div>
        <QuizPagesTabStrip
          fieldIds={pagesController.fields.map((f) => f.id)}
          titles={pagesController.fields.map((f) => (typeof f.title === "string" ? f.title : ""))}
          activeIndex={activePageIndex}
          onSelect={onActivePageIndexChange}
          showAddPage={!isListeningChapter}
          onAddPage={() => {
            const next = pagesController.fields.length;
            pagesController.append(defaultPage(pagesController.fields.length));
            onActivePageIndexChange(next);
          }}
        />
        {activePage ? (
          <PageBlock
            key={activePage.id}
            pageIndex={activePageIndex}
            totalPages={pagesController.fields.length}
            defaultOption={defaultOption}
            defaultQuestion={defaultQuestion}
            quizId={quizId}
            onRemove={() => {
              void onDeletePage(activePageIndex);
            }}
            canRemove={pagesController.fields.length > 1}
            onMoveUp={() => {
              pagesController.move(activePageIndex, activePageIndex - 1);
              onActivePageIndexChange(activePageIndex - 1);
            }}
            onMoveDown={() => {
              pagesController.move(activePageIndex, activePageIndex + 1);
              onActivePageIndexChange(activePageIndex + 1);
            }}
            canMoveUp={activePageIndex > 0}
            canMoveDown={activePageIndex < pagesController.fields.length - 1}
            hidePageTypeSelect={isListeningChapter}
            hidePageTitleFields={isListeningChapter}
            hideAddQuestionButton={isListeningChapter}
            hideQuestionImageBlock={isListeningChapter}
            useLyricsTerminology={isListeningChapter}
            sanitizeTitlePasteWhenEmpty={sanitizeTitlePasteWhenEmpty}
            embeddedInTabs
            crosswordOptions={crosswordOptions}
            onConfirmDeleteQuestion={onConfirmDeleteQuestion}
            onConfirmDeleteOption={onConfirmDeleteOption}
            onConfirmRemoveQuestionImage={onConfirmRemoveQuestionImage}
          />
        ) : null}
      </div>
    </>
  );
}
