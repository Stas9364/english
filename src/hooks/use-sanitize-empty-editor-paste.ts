"use client";

import { useCallback, type ClipboardEvent } from "react";

type UseSanitizeEmptyEditorPasteParams = {
  enabled: boolean;
  draftValue: string;
  setDraftValue: (value: string) => void;
};

function isEditorEffectivelyEmpty(html: string): boolean {
  if (!html) return true;
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const text = (temp.textContent ?? "").replace(/\u00a0/g, " ").trim();
  return text.length === 0;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtmlWithBreaks(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");
}

function htmlToPlainText(html: string): string {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.innerText || temp.textContent || "";
}

export function useSanitizeEmptyEditorPaste({
  enabled,
  draftValue,
  setDraftValue,
}: UseSanitizeEmptyEditorPasteParams) {
  return useCallback(
    (e: ClipboardEvent<HTMLElement>) => {
      if (!enabled) return;
      if (!isEditorEffectivelyEmpty(draftValue)) return;
      if (!isEditorEffectivelyEmpty(e.currentTarget.innerHTML)) return;

      const clipboard = e.clipboardData;
      const plainText = clipboard.getData("text/plain");
      const fallbackHtml = clipboard.getData("text/html");
      const rawText = plainText || htmlToPlainText(fallbackHtml);
      const sanitizedHtml = textToHtmlWithBreaks(rawText);

      e.preventDefault();
      if (!sanitizedHtml) {
        setDraftValue("");
        return;
      }

      document.execCommand("insertHTML", false, sanitizedHtml);
      setDraftValue(sanitizedHtml);
    },
    [draftValue, enabled, setDraftValue]
  );
}
