"use client";

import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { QuizMetaFields } from "@/components/quiz-meta-fields";
import { QuizAiGenerationBlock } from "@/components/quiz-ai-generation-block/quiz-ai-generation-block";
import { QuizPagesTabStrip } from "@/components/page-block/quiz-pages-tab-strip";
import { PageBlock } from "@/components/page-block/page-block";
import type { PageBlockFormValues } from "@/components/page-block/page-block";
import { Label } from "@/components/ui/label";
import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";
import type { TestType } from "@/lib/supabase";
import type { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";

export interface CreateQuizGenerationStatus {
  state: "idle" | "loading" | "error" | "success";
  message?: string;
}

interface CreateQuizDetailsSectionProps {
  form: UseFormReturn<CreateQuizFormValues>;
  topics: { id: string; name: string }[];
  selectedTopicId: string;
  isListeningChapter: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  ai: ReturnType<typeof useQuizAiGeneration>;
  genStatus: CreateQuizGenerationStatus;
  onGenerate: (topicOverride: string) => Promise<void>;
  pagesArray: UseFieldArrayReturn<CreateQuizFormValues, "pages", "id">;
  activePageIndex: number;
  onActivePageIndexChange: (index: number) => void;
  defaultPage: (pageIndex: number, forcedType?: TestType) => CreateQuizFormValues["pages"][number];
  defaultOption: (gapIndex?: number) => CreateQuizFormValues["pages"][number]["questions"][number]["options"][number];
  defaultQuestion: (orderIndex: number, pageType?: TestType) => CreateQuizFormValues["pages"][number]["questions"][number];
  crosswordOptions: CrosswordSelectOption[];
}

export function CreateQuizDetailsSection({
  form,
  topics,
  selectedTopicId,
  isListeningChapter,
  videoUrl,
  onVideoUrlChange,
  ai,
  genStatus,
  onGenerate,
  pagesArray,
  activePageIndex,
  onActivePageIndexChange,
  defaultPage,
  defaultOption,
  defaultQuestion,
  crosswordOptions,
}: CreateQuizDetailsSectionProps) {
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

      {!isListeningChapter && (
        <QuizAiGenerationBlock
          topic={ai.topic}
          level={ai.level}
          language={ai.language}
          questionsPerPage={String(ai.questionsPerPage)}
          selectedType={ai.selectedType as TestType}
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
          onCustomTaskChange={ai.setCustomTask}
          onStyleChange={ai.setStyle}
          onConstraintsChange={ai.setConstraints}
          onLexiconChange={ai.setLexicon}
          onBannedTopicsChange={ai.setBannedTopics}
          onSelectedModelChange={ai.setSelectedModel}
          isGenerating={ai.isGenerating}
          onGenerate={onGenerate}
          generatedSummary={genStatus.state === "success" ? genStatus.message ?? null : null}
          errorMessage={ai.errorMessage ?? (genStatus.state === "error" ? genStatus.message ?? null : null)}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label>Pages</Label>
          <span className="text-sm text-muted-foreground">Pages: {pagesArray.fields.length}</span>
        </div>
        <QuizPagesTabStrip
          fieldIds={pagesArray.fields.map((f) => f.id)}
          titles={pagesArray.fields.map((f) => (typeof f.title === "string" ? f.title : ""))}
          activeIndex={activePageIndex}
          onSelect={onActivePageIndexChange}
          showAddPage={!isListeningChapter}
          onAddPage={() => {
            const next = pagesArray.fields.length;
            pagesArray.append(defaultPage(pagesArray.fields.length));
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
            quizId={undefined}
            onRemove={() => {
              const nextIndex = Math.max(0, Math.min(activePageIndex, pagesArray.fields.length - 2));
              pagesArray.remove(activePageIndex);
              onActivePageIndexChange(nextIndex);
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
            sanitizeTitlePasteWhenEmpty={isListeningChapter}
            embeddedInTabs
            crosswordOptions={crosswordOptions}
          />
        ) : null}
      </div>
    </>
  );
}
