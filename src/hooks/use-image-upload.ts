"use client";

import { useCallback, useState } from "react";

type UploadImageResult = { ok: true; url: string } | { ok: false; error: string };

type UploadImageAction = (formData: FormData) => Promise<UploadImageResult>;

type PrimitiveTarget = string | number;

interface UseImageUploadParams {
  uploadImage: UploadImageAction;
  baseFields?: Record<string, string | undefined>;
}

export function useImageUpload<TTarget extends PrimitiveTarget>({
  uploadImage,
  baseFields,
}: UseImageUploadParams) {
  const [uploadingTarget, setUploadingTarget] = useState<TTarget | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadForTarget = useCallback(
    async (target: TTarget, file: File, extraFields?: Record<string, string | undefined>) => {
      setUploadError(null);
      setUploadingTarget(target);

      const formData = new FormData();
      formData.set("file", file);

      const fields = { ...baseFields, ...extraFields };
      for (const [key, value] of Object.entries(fields)) {
        if (value) formData.set(key, value);
      }

      const result = await uploadImage(formData);
      setUploadingTarget(null);

      if (!result.ok) {
        setUploadError(result.error);
        return null;
      }

      return result.url;
    },
    [baseFields, uploadImage]
  );

  return {
    uploadingTarget,
    uploadError,
    setUploadError,
    uploadForTarget,
  };
}
