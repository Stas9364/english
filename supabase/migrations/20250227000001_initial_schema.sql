-- Таблицы для приложения тестов по английскому
-- Выполни в Supabase Dashboard → SQL Editor (или через Supabase CLI: supabase db push)

-- 1. Тесты
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- 2. Вопросы (один тест — много вопросов)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists questions_quiz_id_idx on public.questions(quiz_id);

-- 3. Варианты ответов (один вопрос — много вариантов)
create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false
);

create index if not exists options_question_id_idx on public.options(question_id);

-- 4. Список email-адресов с доступом в админку (добавляй вручную в Table Editor или через SQL)
create table if not exists public.admin_emails (
  email text primary key
);

-- Вставь свой email для доступа в админку (замени на свой и выполни один раз):
-- insert into public.admin_emails (email) values ('твой-email@gmail.com');
