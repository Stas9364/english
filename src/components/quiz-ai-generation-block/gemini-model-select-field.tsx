"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listGeminiModels, type GeminiModelOption } from "@/app/admin/ai-generate";

type GeminiModelSelectFieldProps = {
  selectedModel: string;
  onSelectedModelChange: (value: string) => void;
  isGenerating: boolean;
};

export function GeminiModelSelectField({
  selectedModel,
  onSelectedModelChange,
  isGenerating,
}: GeminiModelSelectFieldProps) {
  const [availableModels, setAvailableModels] = useState<GeminiModelOption[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isModelsLoading, setIsModelsLoading] = useState(false);

  const selectedModelMeta = availableModels.find((m) => m.name === selectedModel) ?? null;

  const loadModels = async () => {
    setIsModelsLoading(true);
    setModelsError(null);
    try {
      const response = await listGeminiModels();
      if (!response.ok) {
        setModelsError(response.error);
        setAvailableModels([]);
        return;
      }
      setAvailableModels(response.models);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setModelsError(message);
    } finally {
      setIsModelsLoading(false);
    }
  };

  useEffect(() => {
    void loadModels();
  }, []);

  useEffect(() => {
    if (availableModels.length === 0) return;
    const hasSelectedModel = availableModels.some((m) => m.name === selectedModel);
    if (!hasSelectedModel) {
      onSelectedModelChange(availableModels[0].name);
    }
  }, [availableModels, onSelectedModelChange, selectedModel]);

  return (
    <div className="space-y-2">
      <Label htmlFor="gemini-model-select">Gemini model</Label>
      <select
        id="gemini-model-select"
        className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:scheme-dark"
        value={selectedModel}
        onChange={(e) => onSelectedModelChange(e.target.value)}
        disabled={isModelsLoading || availableModels.length === 0 || isGenerating}
      >
        {availableModels.map((model) => (
          <option key={model.name} value={model.name}>
            {model.displayName}
          </option>
        ))}
      </select>

      {selectedModelMeta?.description && (
        <p className="text-xs text-muted-foreground">{selectedModelMeta.description}</p>
      )}

      {isModelsLoading && (
        <p className="text-xs text-muted-foreground">Loading Gemini models...</p>
      )}

      {modelsError && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-destructive">{modelsError}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadModels()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
