"use client";

import { useMemo } from "react";

interface QuizVideoPlayerProps {
  url?: string | null;
  title: string;
}

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function QuizVideoPlayer({ url, title }: QuizVideoPlayerProps) {
  const videoEmbedUrl = useMemo(() => getYouTubeEmbedUrl(url), [url]);
  if (!videoEmbedUrl) return null;

  return (
    <div className="mb-6 flex justify-center">
      <div className="aspect-video w-full">
        <iframe
          src={videoEmbedUrl}
          title={`YouTube video for ${title}`}
          className="absolute left-0 top-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}
