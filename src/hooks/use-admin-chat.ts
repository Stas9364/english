"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/app/admin/chat-action";

const STORAGE_KEY = "admin-chat-messages";

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m &&
        typeof m === "object" &&
        (m as ChatMessage).role &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "model") &&
        typeof (m as ChatMessage).text === "string"
    );
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function useAdminChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loadedFromStorage = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (loadedFromStorage.current) return;
    loadedFromStorage.current = true;
    const stored = loadMessages();
    if (stored.length > 0) {
      const t = setTimeout(() => setMessages(stored), 0);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  function clearChat() {
    setMessages([]);
    setError(null);
    saveMessages([]);
  }

  function stopGeneration() {
    abortControllerRef.current?.abort();
  }

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || loading) return;

    setInputValue("");
    setError(null);
    setStreamingText("");
    const userMessage: ChatMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/admin/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? `Request failed (${res.status})`);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response body");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed) as { text?: string; error?: string };
            if (data.error) {
              setError(data.error);
              setLoading(false);
              return;
            }
            if (typeof data.text === "string") {
              fullText += data.text;
              setStreamingText(fullText);
            }
          } catch {
            // skip invalid JSON lines
          }
        }
      }

      setMessages((prev) => [...prev, { role: "model", text: fullText || "(No response)" }]);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled — don't show error
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      abortControllerRef.current = null;
      setStreamingText("");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  return {
    messages,
    inputValue,
    setInputValue,
    loading,
    streamingText,
    error,
    clearChat,
    handleSubmit,
    stopGeneration,
  };
}

