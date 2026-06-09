"use client";

import { QuizTheoryBlocksEditor } from "@/components/quiz-theory-blocks-editor";

interface QuizTheorySectionProps {
  blocks: Array<{
    id?: string;
    type: "text" | "image";
    content: string;
  }>;
  uploadingImageIndex: number | null;
  uploadError: string | null;
  onAddBlock: (type: "text" | "image") => void;
  onRemoveBlock: (index: number) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onUpdateBlock: (
    index: number,
    patch: Partial<{
      id?: string;
      type: "text" | "image";
      content: string;
    }>
  ) => void;
  onUploadImage: (index: number, file: File) => Promise<void>;
}

export function QuizTheorySection({
  blocks,
  uploadingImageIndex,
  uploadError,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onUpdateBlock,
  onUploadImage,
}: QuizTheorySectionProps) {
  return (
    <QuizTheoryBlocksEditor
      blocks={blocks}
      uploadingImageIndex={uploadingImageIndex}
      uploadError={uploadError}
      onAddBlock={onAddBlock}
      onRemoveBlock={onRemoveBlock}
      onMoveBlock={onMoveBlock}
      onUpdateBlock={onUpdateBlock}
      onUploadImage={onUploadImage}
    />
  );
}
