insert into public.chapters (key, name, order_index, is_active)
values (
  'crossword',
  'Crossword',
  coalesce((select max(order_index) + 1 from public.chapters), 0),
  true
)
on conflict (key) do update
set name = excluded.name,
    is_active = true;

create table if not exists public.crossword_puzzles (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null unique references public.quizzes(id) on delete cascade,
  width integer not null check (width between 1 and 20),
  height integer not null check (height between 1 and 20),
  grid jsonb not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.crossword_entries (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid not null references public.crossword_puzzles(id) on delete cascade,
  answer text not null check (answer ~ '^[A-Z]+$'),
  clue text not null check (length(btrim(clue)) > 0),
  direction text not null check (direction in ('across', 'down')),
  row integer not null check (row >= 0),
  col integer not null check (col >= 0),
  number integer not null check (number > 0),
  order_index integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create index if not exists crossword_entries_puzzle_id_idx
  on public.crossword_entries (puzzle_id);

create index if not exists crossword_entries_puzzle_direction_number_idx
  on public.crossword_entries (puzzle_id, direction, number);

alter table public.crossword_puzzles enable row level security;
alter table public.crossword_entries enable row level security;

create policy "crossword_puzzles_select" on public.crossword_puzzles
  for select using (true);

create policy "crossword_puzzles_insert" on public.crossword_puzzles
  for insert with check (public.is_admin());

create policy "crossword_puzzles_update" on public.crossword_puzzles
  for update using (public.is_admin());

create policy "crossword_puzzles_delete" on public.crossword_puzzles
  for delete using (public.is_admin());

create policy "crossword_entries_select" on public.crossword_entries
  for select using (true);

create policy "crossword_entries_insert" on public.crossword_entries
  for insert with check (public.is_admin());

create policy "crossword_entries_update" on public.crossword_entries
  for update using (public.is_admin());

create policy "crossword_entries_delete" on public.crossword_entries
  for delete using (public.is_admin());

create or replace function public.save_crossword_quiz(
  p_quiz_id uuid,
  p_topic_id uuid,
  p_title text,
  p_description text,
  p_slug text,
  p_width integer,
  p_height integer,
  p_grid jsonb,
  p_entries jsonb
)
returns table (quiz_id uuid, quiz_slug text)
language plpgsql
set search_path = public
as $$
declare
  v_quiz_id uuid;
  v_quiz_slug text;
  v_puzzle_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  if p_width < 1 or p_width > 20 or p_height < 1 or p_height > 20 then
    raise exception 'Crossword grid must be between 1 and 20 cells per side';
  end if;

  if jsonb_typeof(p_grid) <> 'object' then
    raise exception 'Crossword grid must be a JSON object';
  end if;

  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 5 then
    raise exception 'Crossword requires at least 5 words';
  end if;

  if p_quiz_id is null then
    insert into public.quizzes (topic_id, title, description, slug)
    values (p_topic_id, btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), btrim(p_slug))
    returning id, slug into v_quiz_id, v_quiz_slug;
  else
    update public.quizzes
    set topic_id = p_topic_id,
        title = btrim(p_title),
        description = nullif(btrim(coalesce(p_description, '')), ''),
        slug = btrim(p_slug)
    where id = p_quiz_id
    returning id, slug into v_quiz_id, v_quiz_slug;

    if v_quiz_id is null then
      raise exception 'Quiz not found';
    end if;
  end if;

  insert into public.crossword_puzzles (quiz_id, width, height, grid, updated_at)
  values (v_quiz_id, p_width, p_height, p_grid, now())
  on conflict on constraint crossword_puzzles_quiz_id_key do update
  set width = excluded.width,
      height = excluded.height,
      grid = excluded.grid,
      updated_at = now()
  returning id into v_puzzle_id;

  delete from public.crossword_entries
  where puzzle_id = v_puzzle_id;

  insert into public.crossword_entries (
    puzzle_id,
    answer,
    clue,
    direction,
    row,
    col,
    number,
    order_index
  )
  select
    v_puzzle_id,
    upper(btrim(entry.answer)),
    btrim(entry.clue),
    entry.direction,
    entry.row,
    entry.col,
    entry.number,
    entry.order_index
  from jsonb_to_recordset(p_entries) as entry(
    answer text,
    clue text,
    direction text,
    row integer,
    col integer,
    number integer,
    order_index integer
  );

  return query select v_quiz_id, v_quiz_slug;
end;
$$;

grant execute on function public.save_crossword_quiz(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  jsonb,
  jsonb
) to anon, authenticated, service_role;

grant all on table public.crossword_puzzles to anon, authenticated, service_role;
grant all on table public.crossword_entries to anon, authenticated, service_role;
