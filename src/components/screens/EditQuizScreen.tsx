"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  updateQuiz,
  deleteQuizPage,
  deleteQuestion,
  deleteQuestionImage,
  deleteOption,
} from "@/app/admin/actions";
import type { TheoryBlockInput } from "@/app/admin/actions";
import type { QuizWithPages, TestType, TheoryBlock, TheoryBlockType } from "@/lib/supabase";
import type { Chapter } from "@/lib/chapters";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useQuizAiGeneration,
  type GenerateQuizResult,
  type GenerateQuizSuccess,
} from "@/hooks/use-quiz-ai-generation";
import { useTheoryBlocks } from "@/hooks/use-theory-blocks";
import { PageContainer } from "@/components/page-container";
import { editQuizFormSchema, type EditQuizFormValues } from "@/lib/quiz-page-schema";
import { QuizLocalSnapshotIndicator } from "@/components/quiz-local-snapshot-indicator";
import { QuizLocalSnapshotRestoreDialog } from "@/components/quiz-local-snapshot-restore-dialog";
import { useQuizLocalSnapshotAutosave } from "@/hooks/use-quiz-local-snapshot-autosave";
import { useEditQuizInvalidFocus } from "@/hooks/use-edit-quiz-invalid-focus";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import {
  getEditQuizSnapshotKey,
  QUIZ_LOCAL_SNAPSHOT_VERSION,
  readQuizLocalSnapshot,
  type QuizLocalSnapshot,
} from "@/lib/quiz-local-snapshot";
import { EditQuizHeader } from "@/components/screens/edit-quiz-screen/edit-quiz-header";
import { EditQuizDetailsSection } from "@/components/screens/edit-quiz-screen/edit-quiz-details-section";
import {
  EditQuizTabs,
  type EditQuizTabId,
  getEditQuizTabMeta,
} from "@/components/screens/edit-quiz-screen/edit-quiz-tabs";
import { QuizTheorySection } from "@/components/quiz-theory-section";

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

async function runGenerateFlow({
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

function defaultOption(option?: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }, gapIndex?: number) {
  return {
    id: option?.id,
    option_text: option?.option_text ?? "",
    is_correct: option?.is_correct ?? false,
    gap_index: option?.gap_index ?? gapIndex ?? 0,
  };
}

function defaultQuestion(q?: {
  id?: string;
  question_title: string;
  question_image_url?: string | null;
  explanation?: string | null;
  options: { id?: string; option_text: string; is_correct: boolean; gap_index?: number }[];
}, orderIndex?: number) {
  return {
    id: q?.id,
    question_title: q?.question_title ?? "",
    question_image_url: q?.question_image_url ?? "",
    explanation: q?.explanation ?? "",
    order_index: orderIndex ?? 0,
    options: (q?.options?.length ? q.options : [{ option_text: "", is_correct: true, gap_index: 0 }]).map((o) =>
      defaultOption({ id: o.id, option_text: o.option_text, is_correct: o.is_correct ?? true, gap_index: o.gap_index }, o.gap_index)
    ),
  };
}

function defaultQuestionForBlock(orderIndex: number) {
  return defaultQuestion(undefined, orderIndex);
}

function defaultPage(
  p?: {
    id?: string;
    type: TestType;
    title?: string | null;
    example?: string | null;
    questions: {
      id?: string;
      question_title: string;
      question_image_url?: string | null;
      explanation?: string | null;
      options: { id?: string; option_text: string; is_correct: boolean }[];
    }[];
    crossword_quiz_id?: string | null;
  },
  pageIndex?: number,
  forcedType?: TestType
) {
  const type = forcedType ?? p?.type ?? "single";
  return {
    id: p?.id,
    type,
    title: p?.title ?? "",
    example: p?.example ?? "",
    order_index: pageIndex ?? 0,
    crossword_quiz_id: p?.crossword_quiz_id ?? null,
    questions: (p?.questions?.length ? p.questions : [{ question_title: "", question_image_url: "", explanation: "", options: [defaultOption()] }]).map((q, i) =>
      defaultQuestion(q, i)
    ),
  };
}

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
  const [pendingSnapshot, setPendingSnapshot] = useState<QuizLocalSnapshot<EditQuizFormValues> | null>(null);

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
  const selectedTopicId = useWatch({ control: form.control, name: "topic_id" });
  const snapshotKey = useMemo(() => getEditQuizSnapshotKey(quiz.id), [quiz.id]);
  const snapshotAutosave = useQuizLocalSnapshotAutosave<EditQuizFormValues>({
    storageKey: snapshotKey,
    form,
    videoUrl,
    theoryBlocks,
    buildSnapshot: () => ({
      version: QUIZ_LOCAL_SNAPSHOT_VERSION,
      mode: "edit",
      chapter,
      quizId: quiz.id,
      updatedAt: Date.now(),
      formValues: form.getValues(),
      videoUrl,
      theoryBlocks,
    }),
  });
  const markSnapshotRestored = snapshotAutosave.markRestored;

  useEffect(() => {
    const snapshot = readQuizLocalSnapshot<EditQuizFormValues>(snapshotKey, {
      mode: "edit",
      quizId: quiz.id,
    });

    if (snapshot) {
      queueMicrotask(() => setPendingSnapshot(snapshot));
    }
  }, [quiz.id, snapshotKey]);

  function keepDatabaseVersion() {
    setPendingSnapshot(null);
  }

  function applyPendingSnapshot() {
    if (!pendingSnapshot) return;

    form.reset(pendingSnapshot.formValues);
    setVideoUrl(pendingSnapshot.videoUrl ?? "");
    replaceTheoryBlocks(pendingSnapshot.theoryBlocks ?? []);
    setPendingSnapshot(null);
    markSnapshotRestored();
  }

  async function handleGenerate(topicOverride: string) {
    await runGenerateFlow({
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

  async function onSubmit(data: EditQuizFormValues) {
    setResult(null);
    const normalizedVideoUrl = videoUrl.trim();
    if (isListeningChapter && !normalizedVideoUrl) {
      const message = "YouTube video URL is required for listening quizzes.";
      setResult({ ok: false, error: message });
      toast.error("Failed to save quiz", {
        description: message,
      });
      return;
    }

    const res = await updateQuiz({
      quizId: quiz.id,
      topic_id: data.topic_id,
      title: data.title,
      description: data.description,
      slug: data.slug,
      video_url: normalizedVideoUrl || undefined,
      pages: data.pages.map((p, pi) => ({
        id: p.id,
        type: p.type,
        title: p.title || null,
        example: p.example || null,
        crossword_quiz_id: p.type === "crossword" ? p.crossword_quiz_id ?? null : null,
        order_index: pi,
        questions: p.type === "crossword" ? [] : p.questions.map((q, qi) => ({
          id: q.id,
          question_title: q.question_title,
          question_image_url: q.question_image_url || null,
          explanation: q.explanation || null,
          order_index: qi,
          options:
            p.type === "input"
              ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: true, gap_index: o.gap_index ?? 0 })) ?? [])
              : p.type === "select_gaps"
                ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ id: o.id, option_text: o.option_text.trim(), is_correct: o.is_correct, gap_index: o.gap_index ?? 0 })) ?? [])
                : q.options.map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })),
        })),
      })),
      theoryBlocks: theoryBlocks.map((b, i) => ({ ...b, order_index: i })),
    });
    if (process.env.NODE_ENV === "development") {
      console.log("[EditQuiz] updateQuiz response:", res);
    }
    setResult(res);
    if (res.ok) {
      snapshotAutosave.clearSnapshot({ pauseMs: 1000 });
      toast.success("Changes saved", {
        description: "Quiz updated successfully.",
      });
      return;
    }
    toast.error("Failed to save quiz", {
      description: res.error ?? "An error occurred while saving.",
    });
  }

  function handleAddTheoryBlock(type: TheoryBlockType) {
    addTheoryBlock(type);
    setActiveTab("theory");
    toast.info("Theory block added", {
      description: `Block type: ${type}.`,
    });
  }

  async function handleDeletePage(pageIndex: number) {
    const page = form.getValues(`pages.${pageIndex}`);
    if (page?.id) {
      const res = await deleteQuizPage(page.id);
      if (!res.ok) {
        setResult(res);
        toast.error("Failed to delete page", {
          description: res.error ?? "Please try again.",
        });
        return;
      }
    }
    pagesArray.remove(pageIndex);
    setActivePageIndex(0);
    toast.success("Page deleted");
  }

  async function handleConfirmDeleteQuestion(pageIndex: number, questionIndex: number) {
    const question = form.getValues(`pages.${pageIndex}.questions.${questionIndex}`);
    if (question?.id) {
      const response = await deleteQuestion(question.id);
      if (!response.ok) {
        setResult(response);
        toast.error("Failed to delete question", {
          description: response.error ?? "Please try again.",
        });
        return false;
      }
    }

    toast.success("Question deleted");
    return true;
  }

  async function handleConfirmDeleteOption(pageIndex: number, questionIndex: number, optionIndex: number) {
    const options = form.getValues(`pages.${pageIndex}.questions.${questionIndex}.options`);
    const option = options[optionIndex];
    if (option?.id) {
      const response = await deleteOption(option.id);
      if (!response.ok) {
        setResult(response);
        toast.error("Failed to delete answer option", {
          description: response.error ?? "Please try again.",
        });
        return false;
      }
    }

    toast.success("Answer option deleted");
    return true;
  }

  async function handleConfirmRemoveQuestionImage(pageIndex: number, questionIndex: number) {
    const question = form.getValues(`pages.${pageIndex}.questions.${questionIndex}`);
    if (question?.id) {
      const response = await deleteQuestionImage(question.id);
      if (!response.ok) {
        setResult(response);
        toast.error("Failed to delete image", {
          description: response.error ?? "Please try again.",
        });
        return false;
      }
    }

    toast.success("Image deleted");
    return true;
  }

  async function handleRemoveTheoryBlock(index: number) {
    const removed = await handleDeleteTheoryBlock(index);
    if (removed) {
      toast.success("Theory block deleted");
      return;
    }
    toast.error("Failed to delete theory block");
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
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
            {activeTab === "details" && (
              <EditQuizDetailsSection
                form={form}
                topics={topics}
                selectedTopicId={selectedTopicId}
                isListeningChapter={isListeningChapter}
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
                ai={ai}
                generatedSummary={generatedSummary}
                onGenerate={handleGenerate}
                pagesArray={pagesArray}
                activePageIndex={activePageIndex}
                onActivePageIndexChange={setActivePageIndex}
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
              />
            )}

            {activeTab === "theory" && (
              <QuizTheorySection
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
        </CardContent>
      </Card>
    </PageContainer>
  );
}
