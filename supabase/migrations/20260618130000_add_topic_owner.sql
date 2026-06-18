-- Topic ownership: creator is stored as auth.users.id.
-- super_admin may manage all topics.

alter table public.topics
  add column if not exists owner_user_id uuid;

comment on column public.topics.owner_user_id is
  'Supabase Auth user id (auth.users.id). Validated in app/RLS; no FK to auth.users (Dashboard compatibility).';

create index if not exists topics_owner_user_id_idx
  on public.topics (owner_user_id);

create index if not exists topics_chapter_owner_idx
  on public.topics (chapter, owner_user_id);

create or replace function public.can_manage_topic(p_topic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
  or exists (
    select 1
    from public.topics t
    where t.id = p_topic_id
      and t.owner_user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_quiz(p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quizzes q
    where q.id = p_quiz_id
      and public.can_manage_topic(q.topic_id)
  );
$$;

create or replace function public.can_manage_quiz_page(p_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quiz_pages qp
    where qp.id = p_page_id
      and public.can_manage_quiz(qp.quiz_id)
  );
$$;

create or replace function public.can_manage_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.questions qu
    join public.quiz_pages qp on qp.id = qu.page_id
    where qu.id = p_question_id
      and public.can_manage_quiz(qp.quiz_id)
  );
$$;

create or replace function public.can_manage_crossword_puzzle(p_puzzle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crossword_puzzles cp
    where cp.id = p_puzzle_id
      and public.can_manage_quiz(cp.quiz_id)
  );
$$;

-- topics
drop policy if exists "topics_insert" on public.topics;
drop policy if exists "topics_update" on public.topics;
drop policy if exists "topics_delete" on public.topics;

create policy "topics_insert" on public.topics
  for insert
  with check (
    public.is_admin()
    and (
      public.is_super_admin()
      or owner_user_id = auth.uid()
    )
  );

create policy "topics_update" on public.topics
  for update
  using (public.is_admin() and public.can_manage_topic(id))
  with check (
    public.is_admin()
    and public.can_manage_topic(id)
    and (
      public.is_super_admin()
      or owner_user_id = auth.uid()
    )
  );

create policy "topics_delete" on public.topics
  for delete
  using (public.is_admin() and public.can_manage_topic(id));

-- quizzes
drop policy if exists "quizzes_insert" on public.quizzes;
drop policy if exists "quizzes_update" on public.quizzes;
drop policy if exists "quizzes_delete" on public.quizzes;

create policy "quizzes_insert" on public.quizzes
  for insert
  with check (public.is_admin() and public.can_manage_topic(topic_id));

create policy "quizzes_update" on public.quizzes
  for update
  using (public.is_admin() and public.can_manage_topic(topic_id))
  with check (public.is_admin() and public.can_manage_topic(topic_id));

create policy "quizzes_delete" on public.quizzes
  for delete
  using (public.is_admin() and public.can_manage_topic(topic_id));

-- quiz_pages
drop policy if exists "quiz_pages_insert" on public.quiz_pages;
drop policy if exists "quiz_pages_update" on public.quiz_pages;
drop policy if exists "quiz_pages_delete" on public.quiz_pages;

create policy "quiz_pages_insert" on public.quiz_pages
  for insert
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "quiz_pages_update" on public.quiz_pages
  for update
  using (public.is_admin() and public.can_manage_quiz(quiz_id))
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "quiz_pages_delete" on public.quiz_pages
  for delete
  using (public.is_admin() and public.can_manage_quiz(quiz_id));

-- questions
drop policy if exists "questions_insert" on public.questions;
drop policy if exists "questions_update" on public.questions;
drop policy if exists "questions_delete" on public.questions;

create policy "questions_insert" on public.questions
  for insert
  with check (public.is_admin() and public.can_manage_quiz_page(page_id));

create policy "questions_update" on public.questions
  for update
  using (public.is_admin() and public.can_manage_quiz_page(page_id))
  with check (public.is_admin() and public.can_manage_quiz_page(page_id));

create policy "questions_delete" on public.questions
  for delete
  using (public.is_admin() and public.can_manage_quiz_page(page_id));

-- options
drop policy if exists "options_insert" on public.options;
drop policy if exists "options_update" on public.options;
drop policy if exists "options_delete" on public.options;

create policy "options_insert" on public.options
  for insert
  with check (public.is_admin() and public.can_manage_question(question_id));

create policy "options_update" on public.options
  for update
  using (public.is_admin() and public.can_manage_question(question_id))
  with check (public.is_admin() and public.can_manage_question(question_id));

create policy "options_delete" on public.options
  for delete
  using (public.is_admin() and public.can_manage_question(question_id));

-- theory_blocks
drop policy if exists "theory_blocks_insert" on public.theory_blocks;
drop policy if exists "theory_blocks_update" on public.theory_blocks;
drop policy if exists "theory_blocks_delete" on public.theory_blocks;

create policy "theory_blocks_insert" on public.theory_blocks
  for insert
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "theory_blocks_update" on public.theory_blocks
  for update
  using (public.is_admin() and public.can_manage_quiz(quiz_id))
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "theory_blocks_delete" on public.theory_blocks
  for delete
  using (public.is_admin() and public.can_manage_quiz(quiz_id));

-- quiz_listenings_meta
drop policy if exists "quiz_listenings_meta_insert" on public.quiz_listenings_meta;
drop policy if exists "quiz_listenings_meta_update" on public.quiz_listenings_meta;
drop policy if exists "quiz_listenings_meta_delete" on public.quiz_listenings_meta;

create policy "quiz_listenings_meta_insert" on public.quiz_listenings_meta
  for insert
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "quiz_listenings_meta_update" on public.quiz_listenings_meta
  for update
  using (public.is_admin() and public.can_manage_quiz(quiz_id))
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "quiz_listenings_meta_delete" on public.quiz_listenings_meta
  for delete
  using (public.is_admin() and public.can_manage_quiz(quiz_id));

-- crossword_puzzles
drop policy if exists "crossword_puzzles_insert" on public.crossword_puzzles;
drop policy if exists "crossword_puzzles_update" on public.crossword_puzzles;
drop policy if exists "crossword_puzzles_delete" on public.crossword_puzzles;

create policy "crossword_puzzles_insert" on public.crossword_puzzles
  for insert
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "crossword_puzzles_update" on public.crossword_puzzles
  for update
  using (public.is_admin() and public.can_manage_quiz(quiz_id))
  with check (public.is_admin() and public.can_manage_quiz(quiz_id));

create policy "crossword_puzzles_delete" on public.crossword_puzzles
  for delete
  using (public.is_admin() and public.can_manage_quiz(quiz_id));

-- crossword_entries
drop policy if exists "crossword_entries_insert" on public.crossword_entries;
drop policy if exists "crossword_entries_update" on public.crossword_entries;
drop policy if exists "crossword_entries_delete" on public.crossword_entries;

create policy "crossword_entries_insert" on public.crossword_entries
  for insert
  with check (public.is_admin() and public.can_manage_crossword_puzzle(puzzle_id));

create policy "crossword_entries_update" on public.crossword_entries
  for update
  using (public.is_admin() and public.can_manage_crossword_puzzle(puzzle_id))
  with check (public.is_admin() and public.can_manage_crossword_puzzle(puzzle_id));

create policy "crossword_entries_delete" on public.crossword_entries
  for delete
  using (public.is_admin() and public.can_manage_crossword_puzzle(puzzle_id));

-- quiz_page_crosswords
drop policy if exists "quiz_page_crosswords_insert" on public.quiz_page_crosswords;
drop policy if exists "quiz_page_crosswords_update" on public.quiz_page_crosswords;
drop policy if exists "quiz_page_crosswords_delete" on public.quiz_page_crosswords;

create policy "quiz_page_crosswords_insert" on public.quiz_page_crosswords
  for insert
  with check (
    public.is_admin()
    and public.can_manage_quiz_page(page_id)
    and public.can_manage_quiz(crossword_quiz_id)
  );

create policy "quiz_page_crosswords_update" on public.quiz_page_crosswords
  for update
  using (public.is_admin() and public.can_manage_quiz_page(page_id))
  with check (
    public.is_admin()
    and public.can_manage_quiz_page(page_id)
    and public.can_manage_quiz(crossword_quiz_id)
  );

create policy "quiz_page_crosswords_delete" on public.quiz_page_crosswords
  for delete
  using (public.is_admin() and public.can_manage_quiz_page(page_id));

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

  if not public.can_manage_topic(p_topic_id) then
    raise exception 'Unauthorized';
  end if;

  if p_quiz_id is not null and not public.can_manage_quiz(p_quiz_id) then
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

grant execute on function public.can_manage_topic(uuid) to anon, authenticated, service_role;
grant execute on function public.can_manage_quiz(uuid) to anon, authenticated, service_role;
grant execute on function public.can_manage_quiz_page(uuid) to anon, authenticated, service_role;
grant execute on function public.can_manage_question(uuid) to anon, authenticated, service_role;
grant execute on function public.can_manage_crossword_puzzle(uuid) to anon, authenticated, service_role;
