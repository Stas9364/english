"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "how-quiz-works", label: "Как устроен квиз", items: [] },
  {
    id: "ai-generation",
    label: "Автогенерация (AI)",
    items: [
      { id: "ai-generation-basic", label: "Базовый режим" },
      { id: "ai-generation-custom", label: "Custom task" },
    ],
  },
  {
    id: "create-quiz",
    label: "Создание квиза",
    items: [
      { id: "create-quiz-step-1", label: "Шаг 1. Основные поля" },
      { id: "create-quiz-step-2", label: "Шаг 2. Страницы" },
      { id: "create-quiz-step-3", label: "Шаг 3. Вопросы в странице" },
      { id: "create-quiz-step-4", label: "Шаг 4. Варианты ответов" },
      { id: "create-quiz-step-5", label: "Шаг 5. Ответы Text input" },
      { id: "create-quiz-step-6", label: "Шаг 6. Dropdown in gaps" },
      { id: "create-quiz-step-7", label: "Шаг 7. Matching" },
      { id: "create-quiz-step-8", label: "Шаг 8. Теория" },
      { id: "create-quiz-step-9", label: "Шаг 9. Сохранение" },
    ],
  },
  {
    id: "edit-quiz",
    label: "Редактирование",
    items: [
      { id: "edit-quiz-details-pages", label: "Details and pages" },
      { id: "edit-quiz-theory", label: "Theory" },
    ],
  },
  { id: "delete-save", label: "Удаление и сохранение", items: [] },
  { id: "cheatsheet", label: "Краткая памятка", items: [] },
  {
    id: "ai-chat",
    label: "Админ‑чат с ИИ",
    items: [
      { id: "ai-chat-history", label: "История чата" },
      { id: "ai-chat-clear-history", label: "Очистка истории" },
      { id: "ai-chat-stop-response", label: "Остановка ответа" },
      { id: "ai-chat-rate-limits", label: "Лимиты модели" },
    ],
  },
];

export function GuideToc() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observedIds: string[] = [];

    for (const section of sections) {
      observedIds.push(section.id);
      section.items.forEach((item) => {
        observedIds.push(item.id);
      });
    }

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

    for (const id of observedIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const isSectionActive = (sectionId: string, items: { id: string; label: string }[]) =>
    activeId === sectionId || items.some((item) => item.id === activeId);

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block w-52 shrink-0">
        <nav className="sticky top-8 space-y-0.5">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Содержание
          </p>
          {sections.map(({ id, label, items }) => (
            <div key={id} className="space-y-0.5">
              <a
                href={`#${id}`}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  isSectionActive(id, items)
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </a>
              {items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "block w-full rounded-md py-1 pl-6 pr-2 text-left text-xs transition-colors",
                    activeId === item.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile: horizontal scrollable bar */}
      <nav className="lg:hidden flex gap-1 overflow-x-auto pb-1 border-b">
        {sections.map(({ id, label, items }) => (
          <div key={id} className="flex shrink-0 items-center gap-1">
            <a
              href={`#${id}`}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors whitespace-nowrap",
                isSectionActive(id, items)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </a>
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-[11px] transition-colors whitespace-nowrap",
                  activeId === item.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}
