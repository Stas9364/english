"use client";

import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { deleteTopic } from "@/app/admin/actions";
import { AdminTopicCreateForm } from "@/components/admin-topic-create-form";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Topic } from "@/lib/supabase";
import Link from "next/link";
import { useTopicEditing } from "@/hooks/use-topic-editing";

interface AdminScreenProps {
  topics: Topic[];
}

export function AdminScreen({ topics }: AdminScreenProps) {
  const router = useRouter();
  const {
    editingTopicId,
    draftName,
    draftDescription,
    isSaving,
    setDraftName,
    setDraftDescription,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useTopicEditing();

  return (
    <PageContainer className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <CardDescription>
            Choose a topic to open quizzes in this category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTopicCreateForm onCreated={() => router.refresh()} />

          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No topics yet. Add topics in database first.
            </p>
          ) : (
            <ul className="space-y-2">
              {topics.map((topic) => (
                <li
                  key={topic.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 gap-3"
                >
                  <div className="min-w-0">
                    {editingTopicId === topic.id ? (
                      <div className="space-y-2">
                        <Input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          placeholder="Topic name"
                          className="h-8"
                        />
                        <Input
                          value={draftDescription}
                          onChange={(e) => setDraftDescription(e.target.value)}
                          placeholder="Topic description"
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="truncate font-medium">{topic.name}</p>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground truncate">{topic.description}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/${topic.slug}`}>Open</Link>
                    </Button>
                    {editingTopicId === topic.id ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Save topic"
                          disabled={isSaving}
                          onClick={() => void saveEdit(topic.id)}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Cancel edit"
                          disabled={isSaving}
                          onClick={cancelEdit}
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title="Edit topic"
                        onClick={() => startEdit(topic)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    <ConfirmDeletePopover
                      title="Delete this topic?"
                      onConfirm={async () => {
                        const res = await deleteTopic(topic.id);
                        if (!res.ok) {
                          window.alert(res.error ?? "Failed to delete topic");
                          return;
                        }
                        router.refresh();
                      }}
                    >
                      <Button type="button" variant="ghost" size="icon-sm" title="Delete topic">
                        <Trash2 className="size-4" />
                      </Button>
                    </ConfirmDeletePopover>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
