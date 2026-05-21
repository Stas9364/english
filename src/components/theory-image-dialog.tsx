"use client";

import { useState } from "react";
import { TheoryImage } from "@/components/theory-image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface TheoryImageDialogProps {
  src: string;
}

export function TheoryImageDialog({ src }: TheoryImageDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="cursor-zoom-in text-left"
          aria-label="Open image in fullscreen"
        >
          <TheoryImage src={src} maxHeight="70vh" />
        </button>
      </DialogTrigger>
      <DialogContent
        title="Image preview"
        overlayClassName="bg-black/90"
        className="inset-0 left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-black/90 p-4 sm:p-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <TheoryImage
          src={src}
          maxHeight="90vh"
          className="mt-0 border-0 bg-transparent"
        />
      </DialogContent>
    </Dialog>
  );
}
