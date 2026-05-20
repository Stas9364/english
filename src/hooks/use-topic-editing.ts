"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTopic } from "@/app/admin/actions";
import type { Topic } from "@/lib/supabase";
import { toast } from "sonner";

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
    const normalizedName = draftName.trim();
    if (!normalizedName) {
      toast.error("Failed to update topic", {
        description: "Topic name is required.",
      });
      return;
    }

    setIsSaving(true);
    const res = await updateTopic(topicId, {
      name: normalizedName,
      description: draftDescription,
    });
    setIsSaving(false);

    if (!res.ok) {
      toast.error("Failed to update topic", {
        description: res.error ?? "Please try again.",
      });
      return;
    }

    cancelEdit();
    router.refresh();
    toast.success("Topic updated");
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
