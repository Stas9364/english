-- Блоки теории к квизу: текст или изображение (URL)

-- 1. Тип блока
create type public.block_type as enum ('text', 'image');

-- 2. Таблица блоков теории
create table public.theory_blocks (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type public.block_type not null,
  content text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index theory_blocks_quiz_id_idx on public.theory_blocks(quiz_id);

-- 3. RLS (как у quizzes: чтение всем, запись только админам)
alter table public.theory_blocks enable row level security;

create policy "theory_blocks_select" on public.theory_blocks for select using (true);
create policy "theory_blocks_insert" on public.theory_blocks for insert with check (public.is_admin());
create policy "theory_blocks_update" on public.theory_blocks for update using (public.is_admin());
create policy "theory_blocks_delete" on public.theory_blocks for delete using (public.is_admin());
