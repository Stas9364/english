-- Новая схема: квизы → страницы (quiz_pages) → вопросы → варианты
-- Тип страницы: single | multiple | input

-- 1. Удаление старых таблиц (порядок из-за FK)
drop table if exists public.options;
drop table if exists public.questions;
drop table if exists public.quizzes;

-- 2. Тип страницы/теста
create type public.test_type as enum ('single', 'multiple', 'input');

-- 3. Квизы (общее задание)
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 4. Страницы квиза (одна страница — один тип: single / multiple / input)
create table public.quiz_pages (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type public.test_type not null,
  title text,
  order_index int not null default 0
);

create index quiz_pages_quiz_id_idx on public.quiz_pages(quiz_id);

-- 5. Вопросы (привязаны к странице)
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.quiz_pages(id) on delete cascade,
  question_title text not null,
  explanation text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index questions_page_id_idx on public.questions(page_id);

-- 6. Варианты ответов
create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false
);

create index options_question_id_idx on public.options(question_id);

-- 7. RLS (admin_emails и is_admin() уже есть)
alter table public.quizzes enable row level security;
alter table public.quiz_pages enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;

create policy "quizzes_select" on public.quizzes for select using (true);
create policy "quizzes_insert" on public.quizzes for insert with check (public.is_admin());
create policy "quizzes_update" on public.quizzes for update using (public.is_admin());
create policy "quizzes_delete" on public.quizzes for delete using (public.is_admin());

create policy "quiz_pages_select" on public.quiz_pages for select using (true);
create policy "quiz_pages_insert" on public.quiz_pages for insert with check (public.is_admin());
create policy "quiz_pages_update" on public.quiz_pages for update using (public.is_admin());
create policy "quiz_pages_delete" on public.quiz_pages for delete using (public.is_admin());

create policy "questions_select" on public.questions for select using (true);
create policy "questions_insert" on public.questions for insert with check (public.is_admin());
create policy "questions_update" on public.questions for update using (public.is_admin());
create policy "questions_delete" on public.questions for delete using (public.is_admin());

create policy "options_select" on public.options for select using (true);
create policy "options_insert" on public.options for insert with check (public.is_admin());
create policy "options_update" on public.options for update using (public.is_admin());
create policy "options_delete" on public.options for delete using (public.is_admin());
