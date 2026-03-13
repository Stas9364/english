"use server";

import { getIsAdmin } from "@/lib/supabase";

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};
export type SendChatMessageParams = {
  message: string;
  history?: ChatMessage[];
};

export type SendChatMessageOk = { ok: true; text: string };
export type SendChatMessageErr = { ok: false; error: string };

/**
 * Отправляет сообщение в чат с моделью Gemma 3 12B (gemma-3-12b-it).
 * Доступно только администраторам. Использует GEMINI_API_KEY.
 */
export async function sendChatMessage(
  params: SendChatMessageParams
): Promise<SendChatMessageOk | SendChatMessageErr> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return {
      ok: false,
      error: "Admin only. Log in and ensure your email is in admin_emails.",
    };
  }

  const MAX_MESSAGE_CHARS = 4000;
  const message = (params.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) return { ok: false, error: "Message is required" };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "GEMINI_API_KEY is not set. Add it to .env or .env.local and restart the dev server.",
    };
  }

  const MAX_HISTORY_MESSAGES = 10;
  const history = (params.history ?? []).slice(-MAX_HISTORY_MESSAGES);
  const contents: Array<{ parts: Array<{ text: string }> }> = [];

  for (const m of history) {
    const text = (m.text ?? "").trim();
    if (text) contents.push({ parts: [{ text }] });
  }

  contents.push({ parts: [{ text: message }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-12b-it:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const signal =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? (AbortSignal as { timeout(ms: number): AbortSignal }).timeout(60_000)
        : undefined;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, error: "API authorization failed. Check GEMINI_API_KEY." };
      }
      if (resp.status === 429) {
        return { ok: false, error: "Rate limit exceeded. Try again later." };
      }
      return { ok: false, error: `Request failed (${resp.status}). Try again later.` };
    }

    type Part = { text?: string };
    type ApiResponse = {
      candidates?: Array<{ content?: { parts?: Part[] } }>;
    };
    const json = (await resp.json()) as ApiResponse;
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    return { ok: true, text: text || "(No response)" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (/abort/i.test(msg) || /timeout/i.test(msg)) {
      return { ok: false, error: "Request timed out. Try again." };
    }
    return { ok: false, error: msg || "Unknown error" };
  }
}



