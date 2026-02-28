"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TheoryImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** Optional max height (e.g. "70vh") so the block doesn't exceed viewport */
  maxHeight?: string;
}

/**
 * Renders an image so the block takes only the space of the image (intrinsic size).
 * Uses Next.js Image; dimensions are set from onLoad to avoid fixed-height containers.
 */
export function TheoryImage({ src, alt = "", className, maxHeight }: TheoryImageProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  return (
    <div
      className={cn("mt-2 w-fit max-w-full overflow-hidden rounded-md border", className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        width={size?.w ?? 800}
        height={size?.h ?? 600}
        unoptimized
        className="block h-auto max-w-full object-contain"
        style={maxHeight ? { maxHeight } : undefined}
        onLoad={(e) => {
          const el = e.target as HTMLImageElement;
          if (el.naturalWidth && el.naturalHeight) {
            setSize({ w: el.naturalWidth, h: el.naturalHeight });
          }
        }}
      />
    </div>
  );
}
