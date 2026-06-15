"use client";

import { useState } from "react";
import { FormProvider, useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { QuizWithPages, TheoryBlock, TheoryBlockType } from "@/lib/supabase";
import type { Chapter } from "@/lib/chapters";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useQuizAiGeneration,
  type GenerateQuizSuccess,
} from "@/hooks/use-quiz-ai-generation";
import { useTheoryBlocks } from "@/hooks/use-theory-blocks";
import { PageContainer } from "@/components/page-container";
import { editQuizFormSchema, type EditQuizFormValues } from "@/lib/quiz-page-schema";
import { QuizLocalSnapshotIndicator } from "@/components/quiz-local-snapshot-indicator";
import { QuizLocalSnapshotRestoreDialog } from "@/components/quiz-local-snapshot-restore-dialog";
import { useEditQuizInvalidFocus } from "@/hooks/use-edit-quiz-invalid-focus";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import { EditQuizHeader } from "@/components/screens/edit-quiz-screen/edit-quiz-header";
import { EditQuizDetailsSection } from "@/components/screens/edit-quiz-screen/edit-quiz-details-section";
import { EditQuizEditorProvider } from "@/components/screens/edit-quiz-screen/edit-quiz-editor-context";
import {
  EditQuizTabs,
  type EditQuizTabId,
  getEditQuizTabMeta,
} from "@/components/screens/edit-quiz-screen/edit-quiz-tabs";
import { QuizTheoryBlocksEditor } from "@/components/quiz-theory-blocks-editor";
import { useEditQuizDeleteHandlers } from "@/hooks/use-edit-quiz-delete-handlers";
import { useEditQuizSubmit } from "@/hooks/use-edit-quiz-submit";
import { defaultOption, defaultPage, defaultQuestionForBlock } from "@/hooks/edit-quiz-page-defaults";
import { runEditQuizGenerateFlow } from "@/hooks/run-edit-quiz-generate-flow";
import { useEditQuizSnapshot } from "@/hooks/use-edit-quiz-snapshot";

type GenerateOk = GenerateQuizSuccess;

interface EditQuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
  topics: { id: string; name: string }[];
  crosswordOptions?: CrosswordSelectOption[];
  chapter?: Chapter;
  /** Ссылка «назад к списку квизов темы» (по умолчанию хаб админки) */
  backToTopicHref?: string;
}

export function EditQuizScreen({
  quiz,
  theoryBlocks: initialTheoryBlocks = [],
  topics,
  crosswordOptions = [],
  chapter,
  backToTopicHref = "/admin",
}: EditQuizScreenProps) {
  const isListeningChapter = (chapter ?? "").trim().toLowerCase() === "listening";
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState(quiz.video?.url ?? "");
  const [activeTab, setActiveTab] = useState<EditQuizTabId>("details");
  const {
    theoryBlocks,
    uploadingImageIndex,
    uploadError,
    addTheoryBlock,
    handleDeleteTheoryBlock,
    moveTheoryBlock,
    updateTheoryBlock,
    handleTheoryImageUpload,
    appendTheoryBlocks,
    replaceTheoryBlocks,
  } = useTheoryBlocks({
    quizId: quiz.id,
    initialBlocks: initialTheoryBlocks,
    onActionError: (error) => setResult({ ok: false, error }),
  });

  const ai = useQuizAiGeneration({
    initialQuestionsPerPage: 3,
  });
  const [generatedDraft, setGeneratedDraft] = useState<GenerateOk | null>(null);

  const form = useForm<EditQuizFormValues>({
    resolver: zodResolver(editQuizFormSchema),
    defaultValues: {
      topic_id: quiz.topic_id,
      title: quiz.title,
      description: quiz.description ?? "",
      slug: quiz.slug,
      pages: quiz.pages?.length
        ? quiz.pages.map((p, i) =>
          defaultPage(
            { id: p.id, type: p.type, title: p.title, example: p.example, questions: p.questions, crossword_quiz_id: p.crossword?.quiz.id ?? null },
            i,
            isListeningChapter ? "input" : undefined
          )
        )
        : [defaultPage(undefined, 0, isListeningChapter ? "input" : undefined)],
    },
  });
  const [activePageIndex, setActivePageIndex] = useState(0);
  const { onInvalid } = useEditQuizInvalidFocus(form, {
    onFocusPage: setActivePageIndex,
  });

  const pagesArray = useFieldArray({
    control: form.control,
    name: "pages",
  });
  const {
    handleDeletePage,
    handleConfirmDeleteQuestion,
    handleConfirmDeleteOption,
    handleConfirmRemoveQuestionImage,
    handleRemoveTheoryBlock,
  } = useEditQuizDeleteHandlers({
    form,
    pagesArray,
    setActivePageIndex,
    setResult,
    handleDeleteTheoryBlock,
  });
  const selectedTopicId = useWatch({ control: form.control, name: "topic_id" });
  const {
    snapshotAutosave,
    pendingSnapshot,
    keepDatabaseVersion,
    applyPendingSnapshot,
  } = useEditQuizSnapshot({
    quizId: quiz.id,
    chapter,
    form,
    videoUrl,
    setVideoUrl,
    theoryBlocks,
    replaceTheoryBlocks,
  });
  const onSubmit = useEditQuizSubmit({
    quizId: quiz.id,
    isListeningChapter,
    videoUrl,
    theoryBlocks,
    setResult,
    clearSnapshot: () => snapshotAutosave.clearSnapshot({ pauseMs: 1000 }),
  });

  async function handleGenerate(topicOverride: string) {
    await runEditQuizGenerateFlow({
      topicOverride,
      isListeningChapter,
      ai,
      getCurrentPages: () => form.getValues("pages") ?? [],
      replacePages: pagesArray.replace,
      setActivePageIndex,
      appendTheoryBlocks,
      setGeneratedDraft,
    });
  }

  function handleAddTheoryBlock(type: TheoryBlockType) {
    addTheoryBlock(type);
    setActiveTab("theory");
    toast.info("Theory block added", {
      description: `Block type: ${type}.`,
    });
  }

  const generatedSummary = generatedDraft
    ? `Готово: страниц ${generatedDraft.pages.length}, вопросов всего ${generatedDraft.pages.reduce(
      (acc, p) => acc + (p.questions?.length ?? 0),
      0
    )}.` +
    (generatedDraft.theoryBlocks?.length
      ? ` Теория: ${generatedDraft.theoryBlocks.length} блок(ов).`
      : "")
    : null;

  const tabMeta = getEditQuizTabMeta(activeTab);

  return (
    <PageContainer className="space-y-8">
      <QuizLocalSnapshotIndicator
        status={snapshotAutosave.status}
        savedAt={snapshotAutosave.savedAt}
        error={snapshotAutosave.error}
        onDiscard={snapshotAutosave.discardSnapshot}
      />
      <QuizLocalSnapshotRestoreDialog
        open={!!pendingSnapshot}
        updatedAt={pendingSnapshot?.updatedAt}
        onKeepCurrent={keepDatabaseVersion}
        onApplySnapshot={applyPendingSnapshot}
      />
      <EditQuizHeader quizSlug={quiz.slug} backToTopicHref={backToTopicHref} />

      <Card>
        <CardHeader>
          <EditQuizTabs activeTab={activeTab} onChange={setActiveTab} />
          <CardTitle className="pt-2">{tabMeta.title}</CardTitle>
          <CardDescription>{tabMeta.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
              {activeTab === "details" && (
                <EditQuizEditorProvider
                  isListeningChapter={isListeningChapter}
                  pagesArray={pagesArray}
                  activePageIndex={activePageIndex}
                  setActivePageIndex={setActivePageIndex}
                  defaultOption={() => defaultOption()}
                  defaultPage={(pageIndex) =>
                    defaultPage(undefined, pageIndex, isListeningChapter ? "input" : undefined)
                  }
                  defaultQuestion={defaultQuestionForBlock}
                  quizId={quiz.id}
                  crosswordOptions={crosswordOptions}
                  onDeletePage={handleDeletePage}
                  onConfirmDeleteQuestion={handleConfirmDeleteQuestion}
                  onConfirmDeleteOption={handleConfirmDeleteOption}
                  onConfirmRemoveQuestionImage={handleConfirmRemoveQuestionImage}
                >
                  <EditQuizDetailsSection
                    topics={topics}
                    selectedTopicId={selectedTopicId}
                    videoUrl={videoUrl}
                    onVideoUrlChange={setVideoUrl}
                    ai={ai}
                    generatedSummary={generatedSummary}
                    onGenerate={handleGenerate}
                  />
                </EditQuizEditorProvider>
              )}

              {activeTab === "theory" && (
                <QuizTheoryBlocksEditor
                  blocks={theoryBlocks}
                  uploadingImageIndex={uploadingImageIndex}
                  uploadError={uploadError}
                  onAddBlock={handleAddTheoryBlock}
                  onRemoveBlock={(index) => {
                    void handleRemoveTheoryBlock(index);
                  }}
                  onMoveBlock={moveTheoryBlock}
                  onUpdateBlock={updateTheoryBlock}
                  onUploadImage={handleTheoryImageUpload}
                />
              )}

              {result && (
                <Alert variant={result.ok ? "default" : "destructive"}>
                  <AlertDescription>
                    {result.ok ? "Quiz updated successfully." : result.error}
                  </AlertDescription>
                </Alert>
              )}

              <LoadingSubmitButton
                isLoading={form.formState.isSubmitting}
                idleText="Save changes"
              />
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
