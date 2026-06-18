"use client";

import type { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";
import { useEditQuizEditor } from "@/components/edit-quiz-screen/edit-quiz-editor-context";
import { QuizDetailsSection } from "@/components/screens/quiz-details-section";

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

  return (
    <QuizDetailsSection<EditQuizFormValues["pages"][number]>
      topics={topics}
      selectedTopicId={selectedTopicId}
      isListeningChapter={isListeningChapter}
      videoUrl={videoUrl}
      onVideoUrlChange={onVideoUrlChange}
      ai={ai}
      onGenerate={onGenerate}
      generatedSummary={generatedSummary}
      generationError={ai.errorMessage}
      pagesController={{
        fields: pagesArray.fields,
        append: (value) => pagesArray.append(value),
        move: pagesArray.move,
        remove: pagesArray.remove,
      }}
      activePageIndex={activePageIndex}
      onActivePageIndexChange={setActivePageIndex}
      defaultPage={(pageIndex) => defaultPage(pageIndex)}
      defaultOption={defaultOption}
      defaultQuestion={defaultQuestion}
      quizId={quizId}
      crosswordOptions={crosswordOptions}
      onDeletePage={onDeletePage}
      onConfirmDeleteQuestion={onConfirmDeleteQuestion}
      onConfirmDeleteOption={onConfirmDeleteOption}
      onConfirmRemoveQuestionImage={onConfirmRemoveQuestionImage}
    />
  );
}
