"use client";

import { useState } from "react";
import { createTopic } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminTopicCreateFormProps {
  onCreated?: () => void;
}

export function AdminTopicCreateForm({ onCreated }: AdminTopicCreateFormProps) {
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  const handleCreateTopic = async () => {
    const name = newTopicName.trim();
    if (!name) {
      window.alert("Topic name is required");
      return;
    }

    setIsCreatingTopic(true);
    const res = await createTopic({
      name,
      description: newTopicDescription,
    });
    setIsCreatingTopic(false);

    if (!res.ok) {
      window.alert(res.error ?? "Failed to create topic");
      return;
    }

    setNewTopicName("");
    setNewTopicDescription("");
    onCreated?.();
  };

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(200px,1fr)_minmax(220px,1fr)_auto]">
      <Input
        value={newTopicName}
        onChange={(e) => setNewTopicName(e.target.value)}
        placeholder="New topic name"
        className="h-8"
      />
      <Input
        value={newTopicDescription}
        onChange={(e) => setNewTopicDescription(e.target.value)}
        placeholder="New topic description (optional)"
        className="h-8"
      />
      <Button
        type="button"
        className="h-8"
        disabled={isCreatingTopic}
        onClick={() => void handleCreateTopic()}
      >
        {isCreatingTopic ? "Creating..." : "Create"}
      </Button>
    </div>
  );
}
