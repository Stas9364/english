-- Иерархия квизов (общий квиз + подквизы) и текстовые вопросы

-- 1. Иерархия квизов
alter table public.quizzes
  add column if not exists parent_id uuid references public.quizzes(id) on delete cascade,
  add column if not exists page_order integer not null default 1;

create index if not exists quizzes_parent_id_idx on public.quizzes(parent_id);

-- 2. Типы вопросов и текстовые ответы
alter table public.questions
  add column if not exists question_type text not null default 'single_choice',
  add column if not exists correct_answer_text text;

-- Ограничение типов вопросов (для справки; при желании можно оформить как check-constraint)
-- Возможные значения question_type:
--   - 'single_choice'  — один правильный вариант (использует таблицу options)
--   - 'text'           — свободный текст (использует поле correct_answer_text)

