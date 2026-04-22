"use client";

import type { TestType } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { PageBlock, type PageBlockFormValues } from '../page-block/page-block';
import { QuizAiGenerationBlock } from '../quiz-ai-generation-block/quiz-ai-generation-block';
import { QuizTheoryBlocksEditor } from '../quiz-theory-blocks-editor';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useTheoryBlocks } from '@/hooks/use-theory-blocks';
import { useState } from 'react';
import { useQuizAiGeneration } from '@/hooks/use-quiz-ai-generation';
import { createQuizFormSchema, type CreateQuizFormValues } from '@/lib/quiz-page-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Chapter } from "@/lib/chapters";
import { createQuiz } from '@/app/admin/actions';
import { Label } from '../ui/label';
import { QuizTopicSelect } from "@/components/quiz-topic-select";
import { useMemo } from "react";
import Link from "next/link";

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
            ? [{ option_text: "", is_correct: true }]
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
}

export function CreateQuizScreen({ chapter, topics }: CreateQuizScreenProps) {
    const isListeningChapter = chapter.trim().toLowerCase() === "listening";
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
        clearTheoryBlocks,
    } = useTheoryBlocks({});
    const [genStatus, setGenStatus] = useState<
        | { state: "idle" }
        | { state: "loading" }
        | { state: "error"; message: string }
        | { state: "success"; message: string }
    >({ state: "idle" });

    const ai = useQuizAiGeneration();
    // Первая удачная генерация заменяет страницы, последующие — добавляют в конец.
    const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
    const defaultTopicId = useMemo(() => {
        if (topics.length === 0) return "";
        const otherTopic = topics.find((t) => t.name.trim().toLowerCase() === "other");
        return otherTopic?.id ?? topics[0].id;
    }, [topics]);

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
            } else {
                // Если страница уже заполнена ИЛИ генерация не первая — всегда добавляем в конец.
                const appended = [
                    ...current.map((p, i) => ({ ...p, order_index: i })),
                    ...mapped.map((p, i) => ({ ...p, order_index: current.length + i })),
                ] as CreateQuizFormValues["pages"];
                pagesArray.replace(appended);
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
            setResult({ ok: false, error: "YouTube video URL is required for listening quizzes." });
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
                order_index: pi,
                questions: p.questions.map((q, qi) => ({
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
            form.reset({
                topic_id: form.getValues("topic_id"),
                title: "",
                description: "",
                pages: [defaultPage(0, isListeningChapter ? "input" : "single")],
            });
            setVideoUrl("");
            clearTheoryBlocks();
        }
    }
    return (
        <>
            <div className="mb-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/${chapter}`}>Back to topics</Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Create quiz</CardTitle>
                    <CardDescription>
                        Add title, description (general task), then add one or more pages. Each page has one question type (single choice, multiple choice, text input, or dropdown in gaps).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-2">
                            <QuizTopicSelect
                                value={selectedTopicId}
                                onChange={(value) => form.setValue("topic_id", value, { shouldValidate: true })}
                                topics={topics}
                                isLoading={false}
                                error={form.formState.errors.topic_id?.message}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title">Quiz title</Label>
                            <Input
                                id="title"
                                {...form.register("title")}
                                placeholder="e.g. Present Simple"
                                className={cn(form.formState.errors.title && "border-destructive")}
                            />
                            {form.formState.errors.title && (
                                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                            )}
                        </div>
                        {isListeningChapter && (
                            <div className="space-y-2">
                                <Label htmlFor="video_url">YouTube video URL</Label>
                                <Input
                                    id="video_url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
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
                                {...form.register("description")}
                                placeholder="What respondents need to do (shown at the start of the quiz)"
                            />
                        </div>

                        {!isListeningChapter && (
                            <QuizAiGenerationBlock
                                topic={ai.topic}
                                level={ai.level}
                                language={ai.language}
                                questionsPerPage={String(ai.questionsPerPage)}
                                selectedType={ai.selectedType as TestType}
                                customTask={ai.customTask}
                                style={ai.style}
                                constraints={ai.constraints}
                                lexicon={ai.lexicon}
                                bannedTopics={ai.bannedTopics}
                                onTopicChange={ai.setTopic}
                                onLevelChange={ai.setLevel}
                                onLanguageChange={ai.setLanguage}
                                onQuestionsPerPageChange={(value) => ai.setQuestionsPerPage(Number.isFinite(value) ? value : 1)}
                                onSelectedTypeChange={ai.setSelectedType}
                                onCustomTaskChange={ai.setCustomTask}
                                onStyleChange={ai.setStyle}
                                onConstraintsChange={ai.setConstraints}
                                onLexiconChange={ai.setLexicon}
                                onBannedTopicsChange={ai.setBannedTopics}
                                isGenerating={ai.isGenerating}
                                onGenerate={handleGeneratePages}
                                generatedSummary={genStatus.state === "success" ? genStatus.message : null}
                                errorMessage={ai.errorMessage ?? (genStatus.state === "error" ? genStatus.message : null)}
                            />
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <Label>Pages</Label>
                                <span className="text-sm text-muted-foreground">Pages: {pagesArray.fields.length}</span>
                            </div>
                            {pagesArray.fields.map((field, pIndex) => (
                                <PageBlock
                                    key={field.id}
                                    form={form as unknown as UseFormReturn<PageBlockFormValues>}
                                    pageIndex={pIndex}
                                    defaultOption={defaultOption}
                                    defaultQuestion={defaultQuestion}
                                    quizId={undefined}
                                    onRemove={() => pagesArray.remove(pIndex)}
                                    canRemove={pagesArray.fields.length > 1}
                                    hidePageTypeSelect={isListeningChapter}
                                    hidePageTitleFields={isListeningChapter}
                                    hideAddQuestionButton={isListeningChapter}
                                    hideQuestionImageBlock={isListeningChapter}
                                    useLyricsTerminology={isListeningChapter}
                                />
                            ))}
                            {!isListeningChapter && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pagesArray.append(defaultPage(pagesArray.fields.length))}
                                >
                                    <Plus className="size-4" /> Add page
                                </Button>
                            )}
                        </div>

                        <QuizTheoryBlocksEditor
                            blocks={theoryBlocks}
                            uploadingImageIndex={uploadingImageIndex}
                            uploadError={uploadError}
                            onAddBlock={(type) => addTheoryBlock(type)}
                            onRemoveBlock={(index) => removeTheoryBlock(index)}
                            onMoveBlock={(index, dir) => moveTheoryBlock(index, dir)}
                            onUpdateBlock={(index, patch) => updateTheoryBlock(index, patch)}
                            onUploadImage={handleTheoryImageUpload}
                        />

                        {result && (
                            <Alert variant={result.ok ? "default" : "destructive"}>
                                <AlertDescription>
                                    {result.ok ? "Quiz created successfully." : result.error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Saving…" : "Create quiz"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}