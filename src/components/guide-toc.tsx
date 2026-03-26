"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "how-quiz-works", label: "Как устроен квиз" },
  { id: "ai-generation", label: "Автогенерация (AI)" },
  { id: "create-quiz", label: "Создание квиза" },
  { id: "edit-quiz", label: "Редактирование" },
  { id: "delete-save", label: "Удаление и сохранение" },
  { id: "cheatsheet", label: "Краткая памятка" },
  { id: "ai-chat", label: "Админ‑чат с ИИ" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function GuideToc() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: 0 }
    );
    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block w-52 shrink-0">
        <nav className="sticky top-8 space-y-0.5">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Содержание
          </p>
          {sections.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className={cn(
                "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                activeId === id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile: horizontal scrollable bar */}
      <nav className="lg:hidden flex gap-1 overflow-x-auto pb-1 border-b">
        {sections.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors whitespace-nowrap",
              activeId === id
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
