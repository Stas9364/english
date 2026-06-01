alter type public.test_type add value if not exists 'crossword';

create table if not exists public.quiz_page_crosswords (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null unique references public.quiz_pages(id) on delete cascade,
  crossword_quiz_id uuid not null references public.quizzes(id) on delete restrict,
  created_at timestamp with time zone not null default now()
);

create index if not exists quiz_page_crosswords_crossword_quiz_id_idx
  on public.quiz_page_crosswords (crossword_quiz_id);

alter table public.quiz_page_crosswords enable row level security;

create policy "quiz_page_crosswords_select" on public.quiz_page_crosswords
  for select using (true);

create policy "quiz_page_crosswords_insert" on public.quiz_page_crosswords
  for insert with check (public.is_admin());

create policy "quiz_page_crosswords_update" on public.quiz_page_crosswords
  for update using (public.is_admin());

create policy "quiz_page_crosswords_delete" on public.quiz_page_crosswords
  for delete using (public.is_admin());

grant all on table public.quiz_page_crosswords to anon, authenticated, service_role;
