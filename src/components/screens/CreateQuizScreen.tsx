"use client";

import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useTheoryBlocks } from '@/hooks/use-theory-blocks';
import { useState } from 'react';
import { useQuizAiGeneration } from '@/hooks/use-quiz-ai-generation';
import { createQuizFormSchema, type CreateQuizFormValues } from '@/lib/quiz-page-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Chapter } from "@/lib/chapters";
import { useMemo } from "react";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import { QuizLocalSnapshotIndicator } from "@/components/quiz-local-snapshot-indicator";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import {
    CreateQuizDetailsSection,
} from "@/components/screens/create-quiz-screen/create-quiz-details-section";
import { CreateQuizHeader } from "@/components/screens/create-quiz-screen/create-quiz-header";
import { QuizTheoryBlocksEditor } from "@/components/quiz-theory-blocks-editor";
import { useCreateQuizSnapshot } from "@/hooks/use-create-quiz-snapshot";
import { useCreateQuizSubmit } from "@/hooks/use-create-quiz-submit";
import { useCreateQuizGenerate } from "@/hooks/use-create-quiz-generate";
import { defaultOption, defaultPage, defaultQuestion } from "@/hooks/create-quiz-page-defaults";

interface CreateQuizScreenProps {
    chapter: Chapter;
    topics: { id: string; name: string }[];
    crosswordOptions?: CrosswordSelectOption[];
    initialTopicId?: string;
    topicSlug?: string;
}

export function CreateQuizScreen({ chapter, topics, crosswordOptions = [], initialTopicId, topicSlug }: CreateQuizScreenProps) {
    const isListeningChapter = chapter.trim().toLowerCase() === "listening";
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const {
        theoryBlocks,
        uploadingImageIndex,
        uploadError,
        addTheoryBlock,
        removeTheoryBlock,
        moveTheoryBlock,
        updateTheoryBlock,
        handleTheoryImageUpload,
        replaceTheoryBlocks,
        clearTheoryBlocks,
    } = useTheoryBlocks({});
    const ai = useQuizAiGeneration();
    const defaultTopicId = useMemo(() => {
        if (topics.length === 0) return "";
        if (initialTopicId && topics.some((t) => t.id === initialTopicId)) {
            return initialTopicId;
        }
        const otherTopic = topics.find((t) => t.name.trim().toLowerCase() === "other");
        return otherTopic?.id ?? topics[0].id;
    }, [topics, initialTopicId]);

    const form = useForm<CreateQuizFormValues>({
        resolver: zodResolver(createQuizFormSchema),
        defaultValues: {
            topic_id: defaultTopicId,
            title: "",
            description: "",
            pages: [defaultPage(0, isListeningChapter ? "input" : "single")],
        },
    });

    const pagesArray = useFieldArray({
        control: form.control,
        name: "pages",
    });
    const selectedTopicId = useWatch({ control: form.control, name: "topic_id" });
    const { snapshotAutosave } = useCreateQuizSnapshot({
        chapter,
        topicSlug,
        initialTopicId,
        topics,
        form,
        videoUrl,
        setVideoUrl,
        theoryBlocks,
        replaceTheoryBlocks,
    });
    const { genStatus, handleGeneratePages } = useCreateQuizGenerate({
        ai,
        form,
        pagesArray,
        setActivePageIndex,
    });

    const onSubmit = useCreateQuizSubmit({
        chapter,
        isListeningChapter,
        videoUrl,
        theoryBlocks,
        setResult,
        clearSnapshot: () => snapshotAutosave.clearSnapshot({ pauseMs: 1000 }),
        onSuccess: () => {
            form.reset({
                topic_id: form.getValues("topic_id"),
                title: "",
                description: "",
                pages: [defaultPage(0, isListeningChapter ? "input" : "single")],
            });
            setActivePageIndex(0);
            setVideoUrl("");
            clearTheoryBlocks();
        },
    });
    return (
        <>
            <QuizLocalSnapshotIndicator
                status={snapshotAutosave.status}
                savedAt={snapshotAutosave.savedAt}
                error={snapshotAutosave.error}
                onDiscard={snapshotAutosave.discardSnapshot}
            />
            <CreateQuizHeader chapter={chapter} topicSlug={topicSlug} />
            <Card>
                <CardHeader>
                    <CardTitle>Create quiz</CardTitle>
                    <CardDescription>
                        Add title, description (general task), then add one or more pages. Each page has one question type (single choice, multiple choice, text input, or dropdown in gaps).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormProvider {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <CreateQuizDetailsSection
                                topics={topics}
                                selectedTopicId={selectedTopicId}
                                isListeningChapter={isListeningChapter}
                                videoUrl={videoUrl}
                                onVideoUrlChange={setVideoUrl}
                                ai={ai}
                                genStatus={genStatus}
                                onGenerate={handleGeneratePages}
                                pagesArray={pagesArray}
                                activePageIndex={activePageIndex}
                                onActivePageIndexChange={setActivePageIndex}
                                defaultPage={defaultPage}
                                defaultOption={defaultOption}
                                defaultQuestion={defaultQuestion}
                                crosswordOptions={crosswordOptions}
                            />

                            <QuizTheoryBlocksEditor
                                blocks={theoryBlocks}
                                uploadingImageIndex={uploadingImageIndex}
                                uploadError={uploadError}
                                onAddBlock={addTheoryBlock}
                                onRemoveBlock={removeTheoryBlock}
                                onMoveBlock={moveTheoryBlock}
                                onUpdateBlock={updateTheoryBlock}
                                onUploadImage={handleTheoryImageUpload}
                            />

                            {result && (
                                <Alert variant={result.ok ? "default" : "destructive"}>
                                    <AlertDescription>
                                        {result.ok ? "Quiz created successfully." : result.error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <LoadingSubmitButton
                                isLoading={form.formState.isSubmitting}
                                idleText="Create quiz"
                            />
                        </form>
                    </FormProvider>
                </CardContent>
            </Card>
        </>
    );
}