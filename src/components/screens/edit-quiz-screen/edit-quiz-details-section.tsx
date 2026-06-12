"use client";

import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { QuizAiGenerationBlock } from "@/components/quiz-ai-generation-block/quiz-ai-generation-block";
import { QuizPagesTabStrip } from "@/components/page-block/quiz-pages-tab-strip";
import { PageBlock } from "@/components/page-block/page-block";
import type { PageBlockFormValues } from "@/components/page-block/page-block";
import { Label } from "@/components/ui/label";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";
import type { TestType } from "@/lib/supabase";
import type { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import { QuizMetaFields } from "@/components/quiz-meta-fields";

interface EditQuizDetailsTabProps {
  form: UseFormReturn<EditQuizFormValues>;
  topics: { id: string; name: string }[];
  selectedTopicId: string;
  isListeningChapter: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  ai: ReturnType<typeof useQuizAiGeneration>;
  generatedSummary: string | null;
  onGenerate: (topicOverride: string) => Promise<void>;
  pagesArray: UseFieldArrayReturn<EditQuizFormValues, "pages", "id">;
  activePageIndex: number;
  onActivePageIndexChange: (index: number) => void;
  defaultOption: () => { id?: string; option_text: string; is_correct: boolean; gap_index: number };
  defaultPage: (pageIndex?: number) => {
    id?: string;
    type: TestType;
    title: string;
    example: string;
    order_index: number;
    crossword_quiz_id: string | null;
    questions: {
      id?: string;
      question_title: string;
      question_image_url: string;
      explanation: string;
      order_index: number;
      options: { id?: string; option_text: string; is_correct: boolean; gap_index: number }[];
    }[];
  };
  defaultQuestion: (orderIndex: number) => {
    id?: string;
    question_title: string;
    question_image_url: string;
    explanation: string;
    order_index: number;
    options: { id?: string; option_text: string; is_correct: boolean; gap_index: number }[];
  };
  quizId: string;
  crosswordOptions: CrosswordSelectOption[];
  onDeletePage: (pageIndex: number) => Promise<void>;
  onConfirmDeleteQuestion: (pageIndex: number, questionIndex: number) => Promise<boolean>;
  onConfirmDeleteOption: (pageIndex: number, questionIndex: number, optionIndex: number) => Promise<boolean>;
  onConfirmRemoveQuestionImage: (pageIndex: number, questionIndex: number) => Promise<boolean>;
}

export function EditQuizDetailsSection({
  form,
  topics,
  selectedTopicId,
  isListeningChapter,
  videoUrl,
  onVideoUrlChange,
  ai,
  generatedSummary,
  onGenerate,
  pagesArray,
  activePageIndex,
  onActivePageIndexChange,
  defaultOption,
  defaultPage,
  defaultQuestion,
  quizId,
  crosswordOptions,
  onDeletePage,
  onConfirmDeleteOption,
  onConfirmDeleteQuestion,
  onConfirmRemoveQuestionImage,
}: EditQuizDetailsTabProps) {
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
            topic={ai.topic}
            level={ai.level}
            language={ai.language}
            questionsPerPage={String(ai.questionsPerPage)}
            selectedType={ai.selectedType as TestType}
            inputMode={ai.inputMode}
            customTask={ai.customTask}
            style={ai.style}
            constraints={ai.constraints}
            lexicon={ai.lexicon}
            bannedTopics={ai.bannedTopics}
            selectedModel={ai.selectedModel}
            onTopicChange={ai.setTopic}
            onLevelChange={ai.setLevel}
            onLanguageChange={ai.setLanguage}
            onQuestionsPerPageChange={(value) => ai.setQuestionsPerPage(Number.isFinite(value) ? value : 1)}
            onSelectedTypeChange={ai.setSelectedType}
            onInputModeChange={ai.setInputMode}
            onCustomTaskChange={ai.setCustomTask}
            onStyleChange={ai.setStyle}
            onConstraintsChange={ai.setConstraints}
            onLexiconChange={ai.setLexicon}
            onBannedTopicsChange={ai.setBannedTopics}
            onSelectedModelChange={ai.setSelectedModel}
            isGenerating={ai.isGenerating}
            onGenerate={onGenerate}
            generatedSummary={generatedSummary}
            errorMessage={ai.errorMessage}
          />
        )}
        <QuizPagesTabStrip
          fieldIds={pagesArray.fields.map((f) => f.id)}
          titles={pagesArray.fields.map((f) => (typeof f.title === "string" ? f.title : ""))}
          activeIndex={activePageIndex}
          onSelect={onActivePageIndexChange}
          showAddPage={!isListeningChapter}
          onAddPage={() => {
            const next = pagesArray.fields.length;
            pagesArray.append(
              {
                ...defaultPage(pagesArray.fields.length),
              }
            );
            onActivePageIndexChange(next);
          }}
        />
        {activePage ? (
          <PageBlock
            key={activePage.id}
            form={form as unknown as UseFormReturn<PageBlockFormValues>}
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
              onActivePageIndexChange(activePageIndex - 1);
            }}
            onMoveDown={() => {
              pagesArray.move(activePageIndex, activePageIndex + 1);
              onActivePageIndexChange(activePageIndex + 1);
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
