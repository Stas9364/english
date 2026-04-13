"use client";

import { useCallback, useState } from "react";
import { deleteTheoryBlock, uploadTheoryImage } from "@/app/admin/actions";
import type { TheoryBlockInput } from "@/app/admin/actions";
import type { TheoryBlock, TheoryBlockType } from "@/lib/supabase";
import { useImageUpload } from "@/hooks/use-image-upload";

function toTheoryBlockInput(block: TheoryBlock): TheoryBlockInput {
  return {
    id: block.id,
    type: block.type,
    content: block.content,
    order_index: block.order_index,
  };
}

interface UseTheoryBlocksParams {
  quizId?: string;
  initialBlocks?: TheoryBlock[];
  onActionError?: (error: string) => void;
}

export function useTheoryBlocks({ quizId, initialBlocks = [], onActionError }: UseTheoryBlocksParams) {
  const [theoryBlocks, setTheoryBlocks] = useState<TheoryBlockInput[]>(
    () => initialBlocks.map(toTheoryBlockInput)
  );
  const { uploadingTarget: uploadingImageIndex, uploadError, uploadForTarget } = useImageUpload<number>({
    uploadImage: uploadTheoryImage,
    baseFields: quizId ? { quizId } : undefined,
  });

  const addTheoryBlock = useCallback((type: TheoryBlockType) => {
    setTheoryBlocks((prev) => [...prev, { type, content: "", order_index: prev.length }]);
  }, []);

  const removeTheoryBlock = useCallback((index: number) => {
    setTheoryBlocks((prev) => prev.filter((_, i) => i !== index).map((block, i) => ({ ...block, order_index: i })));
  }, []);

  const handleDeleteTheoryBlock = useCallback(
    async (index: number) => {
      const block = theoryBlocks[index];
      if (block?.id) {
        const result = await deleteTheoryBlock(block.id);
        if (!result.ok) {
          onActionError?.(result.error ?? "Failed to delete theory block.");
          return false;
        }
      }
      removeTheoryBlock(index);
      return true;
    },
    [onActionError, removeTheoryBlock, theoryBlocks]
  );

  const moveTheoryBlock = useCallback((index: number, dir: -1 | 1) => {
    setTheoryBlocks((prev) => {
      const next = index + dir;
      if (next < 0 || next >= prev.length) return prev;

      const blocks = [...prev];
      [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
      return blocks.map((block, i) => ({ ...block, order_index: i }));
    });
  }, []);

  const updateTheoryBlock = useCallback((index: number, patch: Partial<TheoryBlockInput>) => {
    setTheoryBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }, []);

  const handleTheoryImageUpload = useCallback(
    async (index: number, file: File) => {
      const url = await uploadForTarget(index, file, { folder: "theory" });
      if (url) updateTheoryBlock(index, { content: url });
    },
    [updateTheoryBlock, uploadForTarget]
  );

  const appendTheoryBlocks = useCallback((blocks: TheoryBlockInput[]) => {
    setTheoryBlocks((prev) => [...prev, ...blocks.map((block, i) => ({ ...block, order_index: prev.length + i }))]);
  }, []);

  const clearTheoryBlocks = useCallback(() => {
    setTheoryBlocks([]);
  }, []);

  return {
    theoryBlocks,
    uploadingImageIndex,
    uploadError,
    addTheoryBlock,
    removeTheoryBlock,
    handleDeleteTheoryBlock,
    moveTheoryBlock,
    updateTheoryBlock,
    handleTheoryImageUpload,
    appendTheoryBlocks,
    clearTheoryBlocks,
  };
}
