"use client";

import { useFormContext } from "react-hook-form";
import { QuizAiGenerationBlock } from "@/components/quiz-ai-generation-block/quiz-ai-generation-block";
import { QuizPagesTabStrip } from "@/components/page-block/quiz-pages-tab-strip";
import { PageBlock } from "@/components/page-block/page-block";
import { Label } from "@/components/ui/label";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";
import type { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import { QuizMetaFields } from "@/components/quiz-meta-fields";
import { useEditQuizEditor } from "@/components/screens/edit-quiz-screen/edit-quiz-editor-context";

interface EditQuizDetailsTabProps {
  topics: { id: string; name: string }[];
  selectedTopicId: string;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  ai: ReturnType<typeof useQuizAiGeneration>;
  generatedSummary: string | null;
  onGenerate: (topicOverride: string) => Promise<void>;
}

export function EditQuizDetailsSection({
  topics,
  selectedTopicId,
  videoUrl,
  onVideoUrlChange,
  ai,
  generatedSummary,
  onGenerate,
}: EditQuizDetailsTabProps) {
  const form = useFormContext<EditQuizFormValues>();
  const {
    isListeningChapter,
    pagesArray,
    activePageIndex,
    setActivePageIndex,
    defaultOption,
    defaultPage,
    defaultQuestion,
    quizId,
    crosswordOptions,
    onDeletePage,
    onConfirmDeleteOption,
    onConfirmDeleteQuestion,
    onConfirmRemoveQuestionImage,
  } = useEditQuizEditor();
  const activePage = pagesArray.fields[activePageIndex];

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

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label>Pages</Label>
          <span className="text-sm text-muted-foreground">Pages: {pagesArray.fields.length}</span>
        </div>
        {!isListeningChapter && (
          <QuizAiGenerationBlock
            ai={ai}
            onGenerate={onGenerate}
            generatedSummary={generatedSummary}
            errorMessage={ai.errorMessage}
          />
        )}
        <QuizPagesTabStrip
          fieldIds={pagesArray.fields.map((f) => f.id)}
          titles={pagesArray.fields.map((f) => (typeof f.title === "string" ? f.title : ""))}
          activeIndex={activePageIndex}
          onSelect={setActivePageIndex}
          showAddPage={!isListeningChapter}
          onAddPage={() => {
            const next = pagesArray.fields.length;
            pagesArray.append(
              {
                ...defaultPage(pagesArray.fields.length),
              }
            );
            setActivePageIndex(next);
          }}
        />
        {activePage ? (
          <PageBlock
            key={activePage.id}
            pageIndex={activePageIndex}
            totalPages={pagesArray.fields.length}
            defaultOption={defaultOption}
            defaultQuestion={defaultQuestion}
            quizId={quizId}
            onRemove={() => {
              void onDeletePage(activePageIndex);
            }}
            canRemove={pagesArray.fields.length > 1}
            onMoveUp={() => {
              pagesArray.move(activePageIndex, activePageIndex - 1);
              setActivePageIndex(activePageIndex - 1);
            }}
            onMoveDown={() => {
              pagesArray.move(activePageIndex, activePageIndex + 1);
              setActivePageIndex(activePageIndex + 1);
            }}
            canMoveUp={activePageIndex > 0}
            canMoveDown={activePageIndex < pagesArray.fields.length - 1}
            hidePageTypeSelect={isListeningChapter}
            hidePageTitleFields={isListeningChapter}
            hideAddQuestionButton={isListeningChapter}
            hideQuestionImageBlock={isListeningChapter}
            useLyricsTerminology={isListeningChapter}
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
