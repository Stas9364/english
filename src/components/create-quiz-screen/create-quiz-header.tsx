"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CreateQuizHeaderProps {
  chapter: string;
  topicSlug?: string;
}

export function CreateQuizHeader({ chapter, topicSlug }: CreateQuizHeaderProps) {
  return (
    <div className="mb-4">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/${chapter}/${topicSlug}`}>Back to {topicSlug}</Link>
      </Button>
    </div>
  );
}
