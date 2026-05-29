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
