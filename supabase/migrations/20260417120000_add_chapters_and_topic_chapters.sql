-- Phase 1: introduce independent chapters taxonomy.
-- One chapter -> many topics. Backward-compatible during migration:
-- keep legacy topics.chapter for now and backfill topics.chapter_id.

-- 1) Chapters catalog (can be reused by different entity types).
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  entity_type text not null default 'topic',
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists chapters_entity_type_order_idx
  on public.chapters(entity_type, order_index);

create index if not exists chapters_entity_type_key_idx
  on public.chapters(entity_type, key);

comment on table public.chapters is 'Reusable chapter taxonomy across entity types';
comment on column public.chapters.key is 'Stable URL-safe chapter key';
comment on column public.chapters.entity_type is 'Entity kind this chapter belongs to, e.g. topic';

-- 2) Add FK to topics (one topic belongs to one chapter).
alter table public.topics
add column if not exists chapter_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_chapter_id_fkey'
  ) then
    alter table public.topics
      add constraint topics_chapter_id_fkey
      foreign key (chapter_id) references public.chapters(id) on delete restrict;
  end if;
end
$$;

create index if not exists topics_chapter_id_order_idx
  on public.topics(chapter_id, order_index);

-- 3) RLS: read for all, write for admins (same policy model as topics).
alter table public.chapters enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chapters' and policyname = 'chapters_select'
  ) then
    create policy "chapters_select" on public.chapters for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chapters' and policyname = 'chapters_insert'
  ) then
    create policy "chapters_insert" on public.chapters for insert with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chapters' and policyname = 'chapters_update'
  ) then
    create policy "chapters_update" on public.chapters for update using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chapters' and policyname = 'chapters_delete'
  ) then
    create policy "chapters_delete" on public.chapters for delete using (public.is_admin());
  end if;

end
$$;

-- 4) Backfill chapters from legacy topics.chapter and link by chapter_id.
insert into public.chapters (key, name, entity_type, order_index)
select distinct
  t.chapter as key,
  initcap(replace(t.chapter, '-', ' ')) as name,
  'topic' as entity_type,
  0 as order_index
from public.topics t
where t.chapter is not null
on conflict (key) do nothing;

update public.topics t
set chapter_id = c.id
from public.chapters c
where c.key = t.chapter
  and c.entity_type = 'topic'
  and t.chapter is not null
  and t.chapter_id is null;
