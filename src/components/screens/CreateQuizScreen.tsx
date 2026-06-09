"use client";

import type { TestType } from '@/lib/supabase';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useTheoryBlocks } from '@/hooks/use-theory-blocks';
import { useEffect, useState } from 'react';
import { useQuizAiGeneration } from '@/hooks/use-quiz-ai-generation';
import { createQuizFormSchema, type CreateQuizFormValues } from '@/lib/quiz-page-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Chapter } from "@/lib/chapters";
import { createQuiz } from '@/app/admin/actions';
import { useMemo } from "react";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import { QuizLocalSnapshotIndicator } from "@/components/quiz-local-snapshot-indicator";
import { useQuizLocalSnapshotAutosave } from "@/hooks/use-quiz-local-snapshot-autosave";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import { toast } from "sonner";
import {
    getCreateQuizSnapshotKey,
    QUIZ_LOCAL_SNAPSHOT_VERSION,
    readQuizLocalSnapshot,
    removeStaleCreateQuizSnapshots,
} from "@/lib/quiz-local-snapshot";
import {
    CreateQuizDetailsSection,
    type CreateQuizGenerationStatus,
} from "@/components/screens/create-quiz-screen/create-quiz-details-section";
import { CreateQuizHeader } from "@/components/screens/create-quiz-screen/create-quiz-header";
import { QuizTheorySection } from "@/components/quiz-theory-section";

function slugify(title: string): string {
    const s = title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return s || "quiz";
}

const defaultOption = (gapIndex?: number) => ({ option_text: "", is_correct: false, gap_index: gapIndex ?? 0 });
function defaultQuestion(orderIndex: number, pageType?: TestType) {
    const options =
        pageType === "matching"
            ? [{ option_text: "", is_correct: true, gap_index: 0 }]
            : [defaultOption()];
    return {
        question_title: "",
        question_image_url: "",
        explanation: "",
        order_index: orderIndex,
        options,
    };
}

function defaultPage(pageIndex: number, forcedType: TestType = "single") {
    return {
        type: forcedType,
        title: "",
        example: "",
        crossword_quiz_id: null,
        order_index: pageIndex,
        questions: [defaultQuestion(0, forcedType)],
    };
}

function isDefaultEmptyPage(page: CreateQuizFormValues["pages"][number] | undefined): boolean {
    if (!page) return false;
    if ((page.title ?? "").trim() !== "") return false;
    if ((page.example ?? "").trim() !== "") return false;
    if (!page.questions || page.questions.length !== 1) return false;
    const q = page.questions[0];
    if ((q.question_title ?? "").trim() !== "") return false;
    if ((q.explanation ?? "").trim() !== "") return false;
    if (q.question_image_url && q.question_image_url.trim() !== "") return false;
    if (!q.options || q.options.length === 0) return true;
    const hasAnyFilledOption = q.options.some((o) => (o.option_text ?? "").trim() !== "");
    if (hasAnyFilledOption) return false;
    return true;
}

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
    const [genStatus, setGenStatus] = useState<CreateQuizGenerationStatus>({ state: "idle" });

    const ai = useQuizAiGeneration();
    // Первая удачная генерация заменяет страницы, последующие — добавляют в конец.
    const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
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
    const snapshotKey = useMemo(
        () => getCreateQuizSnapshotKey(chapter, topicSlug),
        [chapter, topicSlug]
    );
    const snapshotAutosave = useQuizLocalSnapshotAutosave<CreateQuizFormValues>({
        storageKey: snapshotKey,
        form,
        videoUrl,
        theoryBlocks,
        buildSnapshot: () => ({
            version: QUIZ_LOCAL_SNAPSHOT_VERSION,
            mode: "create",
            chapter,
            updatedAt: Date.now(),
            formValues: form.getValues(),
            videoUrl,
            theoryBlocks,
        }),
    });
    const markSnapshotRestored = snapshotAutosave.markRestored;

    useEffect(() => {
        removeStaleCreateQuizSnapshots();

        const snapshot = readQuizLocalSnapshot<CreateQuizFormValues>(snapshotKey, {
            mode: "create",
            chapter,
        });

        const resolvedTopicId =
            initialTopicId && topics.some((t) => t.id === initialTopicId) ? initialTopicId : undefined;

        if (!snapshot) {
            if (resolvedTopicId && form.getValues("topic_id") !== resolvedTopicId) {
                form.setValue("topic_id", resolvedTopicId, { shouldValidate: true });
            }
            return;
        }

        queueMicrotask(() => {
            form.reset({
                ...snapshot.formValues,
                ...(resolvedTopicId ? { topic_id: resolvedTopicId } : {}),
            });
            setVideoUrl(snapshot.videoUrl ?? "");
            replaceTheoryBlocks(snapshot.theoryBlocks ?? []);
            markSnapshotRestored();
        });
    }, [chapter, form, initialTopicId, markSnapshotRestored, replaceTheoryBlocks, snapshotKey, topics]);

    function mapGeneratedPagesToForm(pages: { type: TestType; title?: string | null; questions: { question_title: string; explanation?: string | null; options: { option_text: string; is_correct: boolean; gap_index?: number }[] }[] }[]) {
        return pages.map((p, pi) => ({
            type: p.type,
            title: p.title ?? "",
            example: "",
            order_index: pi,
            questions: (p.questions ?? []).map((q, qi) => ({
                question_title: q.question_title ?? "",
                question_image_url: "",
                explanation: (q.explanation ?? "")?.toString?.() ?? "",
                order_index: qi,
                options: (q.options ?? []).map((o) => ({
                    option_text: o.option_text ?? "",
                    is_correct: !!o.is_correct,
                    ...(typeof o.gap_index === "number" ? { gap_index: o.gap_index } : {}),
                })),
            })),
        })) satisfies CreateQuizFormValues["pages"];
    }

    async function handleGeneratePages(topicOverride: string) {
        ai.setTopic(topicOverride);
        setGenStatus({ state: "loading" });
        try {
            const res = await ai.generate(topicOverride);
            if (!res.ok) {
                setGenStatus({ state: "error", message: res.error });
                return;
            }

            const mapped = mapGeneratedPagesToForm(res.pages);
            const current = form.getValues("pages") ?? [];
            const shouldReplaceFirst =
                !hasGeneratedOnce && current.length === 1 && isDefaultEmptyPage(current[0] as CreateQuizFormValues["pages"][number]);

            if (shouldReplaceFirst) {
                // Первая генерация и форма ещё в дефолтном пустом состоянии — заменяем.
                pagesArray.replace(mapped);
                setActivePageIndex(Math.max(0, mapped.length - 1));
            } else {
                // Если страница уже заполнена ИЛИ генерация не первая — всегда добавляем в конец.
                const appended = [
                    ...current.map((p, i) => ({ ...p, order_index: i })),
                    ...mapped.map((p, i) => ({ ...p, order_index: current.length + i })),
                ] as CreateQuizFormValues["pages"];
                pagesArray.replace(appended);
                setActivePageIndex(current.length + mapped.length - 1);
            }
            setHasGeneratedOnce(true);

            setGenStatus({
                state: "success",
                message: `Сгенерировано страниц: ${res.pages.length}. Проверьте/отредактируйте вопросы ниже перед сохранением квиза.`,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            setGenStatus({ state: "error", message: msg });
        }
    }

    async function onSubmit(data: CreateQuizFormValues) {
        setResult(null);
        const normalizedVideoUrl = videoUrl.trim();
        if (isListeningChapter && !normalizedVideoUrl) {
            const message = "YouTube video URL is required for listening quizzes.";
            setResult({ ok: false, error: message });
            toast.error("Failed to create quiz", {
                description: message,
            });
            return;
        }

        const res = await createQuiz({
            chapter,
            topic_id: data.topic_id,
            title: data.title,
            description: data.description,
            slug: slugify(data.title),
            video_url: normalizedVideoUrl || undefined,
            pages: data.pages.map((p, pi) => ({
                type: p.type,
                title: p.title || null,
                example: p.example || null,
                crossword_quiz_id: p.type === "crossword" ? p.crossword_quiz_id ?? null : null,
                order_index: pi,
                questions: p.type === "crossword" ? [] : p.questions.map((q, qi) => ({
                    question_title: q.question_title,
                    question_image_url: q.question_image_url || null,
                    explanation: q.explanation || null,
                    order_index: qi,
                    options:
                        p.type === "input"
                            ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ option_text: o.option_text.trim(), is_correct: true, gap_index: o.gap_index ?? 0 })) ?? [])
                            : p.type === "select_gaps"
                                ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({ option_text: o.option_text.trim(), is_correct: o.is_correct, gap_index: o.gap_index ?? 0 })) ?? [])
                                : q.options,
                })),
            })),
            theoryBlocks: theoryBlocks.map((b, i) => ({ type: b.type, content: b.content, order_index: i })),
        });
        if (process.env.NODE_ENV === "development") {
            console.log("[Admin] createQuiz response:", res);
        }
        setResult(res);
        if (res.ok) {
            snapshotAutosave.clearSnapshot({ pauseMs: 1000 });
            form.reset({
                topic_id: form.getValues("topic_id"),
                title: "",
                description: "",
                pages: [defaultPage(0, isListeningChapter ? "input" : "single")],
            });
            setActivePageIndex(0);
            setVideoUrl("");
            clearTheoryBlocks();
            toast.success("Quiz created");
            return;
        }
        toast.error("Failed to create quiz", {
            description: res.error ?? "Please try again.",
        });
    }
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <CreateQuizDetailsSection
                            form={form}
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

                        <QuizTheorySection
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
                </CardContent>
            </Card>
        </>
    );
}