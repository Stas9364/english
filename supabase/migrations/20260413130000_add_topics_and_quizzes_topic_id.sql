-- Topics taxonomy for quizzes: one topic -> many quizzes

-- 1) Topics table
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists topics_order_index_idx on public.topics(order_index);
create index if not exists topics_name_idx on public.topics(name);

-- 2) RLS for topics (same model as quizzes: read for all, write for admins)
alter table public.topics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'topics' and policyname = 'topics_select'
  ) then
    create policy "topics_select" on public.topics for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'topics' and policyname = 'topics_insert'
  ) then
    create policy "topics_insert" on public.topics for insert with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'topics' and policyname = 'topics_update'
  ) then
    create policy "topics_update" on public.topics for update using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'topics' and policyname = 'topics_delete'
  ) then
    create policy "topics_delete" on public.topics for delete using (public.is_admin());
  end if;
end
$$;

-- 3) Add topic_id to quizzes
alter table public.quizzes
add column if not exists topic_id uuid;

-- 4) Ensure default topic exists and backfill old quizzes
insert into public.topics (name, slug, description, order_index)
values ('Other', 'other', 'Default topic for existing quizzes', 9999)
on conflict (slug) do nothing;

update public.quizzes
set topic_id = (
  select t.id
  from public.topics t
  where t.slug = 'other'
  limit 1
)
where topic_id is null;

-- 5) FK + NOT NULL + indexes
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quizzes_topic_id_fkey'
  ) then
    alter table public.quizzes
      add constraint quizzes_topic_id_fkey
      foreign key (topic_id) references public.topics(id) on delete restrict;
  end if;
end
$$;

alter table public.quizzes
alter column topic_id set not null;

create index if not exists quizzes_topic_id_idx on public.quizzes(topic_id);
create index if not exists quizzes_topic_id_title_idx on public.quizzes(topic_id, title);
