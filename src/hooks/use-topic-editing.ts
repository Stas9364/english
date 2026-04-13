"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTopic } from "@/app/admin/actions";
import type { Topic } from "@/lib/supabase";

export function useTopicEditing() {
  const router = useRouter();
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setDraftName(topic.name);
    setDraftDescription(topic.description ?? "");
  };

  const cancelEdit = () => {
    setEditingTopicId(null);
    setDraftName("");
    setDraftDescription("");
  };

  const saveEdit = async (topicId: string) => {
    setIsSaving(true);
    const res = await updateTopic(topicId, {
      name: draftName,
      description: draftDescription,
    });
    setIsSaving(false);

    if (!res.ok) {
      window.alert(res.error ?? "Failed to update topic");
      return;
    }

    cancelEdit();
    router.refresh();
  };

  return {
    editingTopicId,
    draftName,
    draftDescription,
    isSaving,
    setDraftName,
    setDraftDescription,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
