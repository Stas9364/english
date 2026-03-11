"use client";

import { TheoryImage } from "@/components/theory-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, FileText, ImageIcon, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

export type TheoryBlockItem = {
  id?: string;
  type: "text" | "image";
  content: string;
};

export interface QuizTheoryBlocksEditorProps {
  blocks: TheoryBlockItem[];
  uploadingImageIndex: number | null;
  uploadError: string | null;

  onAddBlock: (type: "text" | "image") => void;
  onRemoveBlock: (index: number) => void;
  onMoveBlock: (index: number, dir: -1 | 1) => void;
  onUpdateBlock: (index: number, patch: Partial<TheoryBlockItem>) => void;
  onUploadImage: (index: number, file: File) => void | Promise<void>;
}

export function QuizTheoryBlocksEditor({
  blocks,
  uploadingImageIndex,
  uploadError,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onUpdateBlock,
  onUploadImage,
}: QuizTheoryBlocksEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetIndexRef = useRef<number | null>(null);

  return (
    <div className="space-y-4">
      <Label>Theory (optional)</Label>
      <p className="text-sm text-muted-foreground">
        Text and image blocks shown before taking the quiz. You can add them after creating the quiz.
      </p>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const idx = uploadTargetIndexRef.current;
          const f = e.target.files?.[0];
          if (idx != null && f) {
            void onUploadImage(idx, f);
            uploadTargetIndexRef.current = null;
          }
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onAddBlock("text")}>
          <FileText className="size-4" /> Text
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onAddBlock("image")}>
          <ImageIcon className="size-4" /> Image
        </Button>
      </div>
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <Card key={block.id ?? `tb-${index}`} className="border-muted">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {block.type === "text" ? "Text" : "Image"} {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onMoveBlock(index, -1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onMoveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <ConfirmDeletePopover title="Delete block?" onConfirm={() => onRemoveBlock(index)}>
                    <Button type="button" variant="ghost" size="icon-sm">
                      <Trash2 className="size-4" />
                    </Button>
                  </ConfirmDeletePopover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {block.type === "text" ? (
                <>
                  <Label className="text-xs">Text</Label>
                  <textarea
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={block.content}
                    onChange={(e) => onUpdateBlock(index, { content: e.target.value })}
                    placeholder="Enter theory text…"
                  />
                </>
              ) : (
                <>
                  <Label className="text-xs">Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={block.content}
                      onChange={(e) => onUpdateBlock(index, { content: e.target.value })}
                      placeholder="Upload or paste URL"
                      className="min-w-0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImageIndex !== null}
                      onClick={() => {
                        uploadTargetIndexRef.current = index;
                        imageInputRef.current?.click();
                      }}
                    >
                      {uploadingImageIndex === index ? "Uploading…" : (
                        <>
                          <Upload className="size-4" /> Upload
                        </>
                      )}
                    </Button>
                  </div>
                  {uploadError && uploadingImageIndex === null && (
                    <p className="text-sm text-destructive">{uploadError}</p>
                  )}
                  {block.content && <TheoryImage src={block.content} />}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">Add &quot;Text&quot; or &quot;Image&quot; blocks.</p>
      )}
    </div>
  );
}

