-- Listening meta for quiz: one quiz -> one YouTube clip URL

create table if not exists public.quiz_listenings_meta (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

-- Explicit index for fast lookup by quiz_id (unique constraint already indexes it).
create index if not exists quiz_listenings_meta_quiz_id_idx
  on public.quiz_listenings_meta(quiz_id);

-- RLS: read for all, write for admins
alter table public.quiz_listenings_meta enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_listenings_meta'
      and policyname = 'quiz_listenings_meta_select'
  ) then
    create policy "quiz_listenings_meta_select"
      on public.quiz_listenings_meta
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_listenings_meta'
      and policyname = 'quiz_listenings_meta_insert'
  ) then
    create policy "quiz_listenings_meta_insert"
      on public.quiz_listenings_meta
      for insert
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_listenings_meta'
      and policyname = 'quiz_listenings_meta_update'
  ) then
    create policy "quiz_listenings_meta_update"
      on public.quiz_listenings_meta
      for update
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_listenings_meta'
      and policyname = 'quiz_listenings_meta_delete'
  ) then
    create policy "quiz_listenings_meta_delete"
      on public.quiz_listenings_meta
      for delete
      using (public.is_admin());
  end if;
end
$$;
