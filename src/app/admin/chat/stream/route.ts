import { NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/supabase";
import type { ChatMessage } from "@/app/admin/chat-action";

const GEMINI_MODEL = "gemma-3n-e4b-it";

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 10;

function extractTextFromGeminiLine(line: string): string | null {
  if (!line.startsWith("data: ")) return null;
  const jsonStr = line.slice(6).trim();
  if (jsonStr === "[DONE]" || jsonStr === "") return null;
  try {
    const data = JSON.parse(jsonStr) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const history = (body.history ?? []).slice(-MAX_HISTORY_MESSAGES);
  const contents: Array<{ parts: Array<{ text: string }> }> = [];
  for (const m of history) {
    const text = (m.text ?? "").trim();
    if (text) contents.push({ parts: [{ text }] });
  }
  contents.push({ parts: [{ text: message }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return NextResponse.json(
      { error: errText || `Upstream error ${geminiRes.status}` },
      { status: 502 }
    );
  }

  const reader = geminiRes.body?.getReader();
  if (!reader) {
    return NextResponse.json(
      { error: "No response body" },
      { status: 502 }
    );
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          for (const line of buffer.split("\n")) {
            const text = extractTextFromGeminiLine(line);
            if (text) {
              controller.enqueue(
                new TextEncoder().encode(JSON.stringify({ text }) + "\n")
              );
            }
          }
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const text = extractTextFromGeminiLine(line);
          if (text) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({ text }) + "\n")
            );
          }
        }
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
