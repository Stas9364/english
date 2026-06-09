"use client";

import type { ComponentProps } from "react";
import { QuizTopicSelect } from "@/components/quiz-topic-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface QuizMetaFieldsProps {
  selectedTopicId: string;
  onTopicChange: (value: string) => void;
  topics: { id: string; name: string }[];
  topicError?: string;
  titleInputProps: ComponentProps<typeof Input>;
  titleError?: string;
  descriptionInputProps: ComponentProps<typeof Input>;
  isListeningChapter: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
}

export function QuizMetaFields({
  selectedTopicId,
  onTopicChange,
  topics,
  topicError,
  titleInputProps,
  titleError,
  descriptionInputProps,
  isListeningChapter,
  videoUrl,
  onVideoUrlChange,
}: QuizMetaFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <QuizTopicSelect
          value={selectedTopicId}
          onChange={onTopicChange}
          topics={topics}
          isLoading={false}
          error={topicError}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Quiz title</Label>
        <Input
          id="title"
          placeholder="e.g. Present Simple"
          className={cn(titleError && "border-destructive", titleInputProps.className)}
          {...titleInputProps}
        />
        {titleError && <p className="text-sm text-destructive">{titleError}</p>}
      </div>
      {isListeningChapter && (
        <div className="space-y-2">
          <Label htmlFor="video_url">YouTube video URL</Label>
          <Input
            id="video_url"
            value={videoUrl}
            onChange={(event) => onVideoUrlChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            Required for listening quizzes.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="description">General task / instructions</Label>
        <Input
          id="description"
          placeholder="What respondents need to do (shown at the start of the quiz)"
          {...descriptionInputProps}
        />
      </div>
    </>
  );
}
