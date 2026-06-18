-- Backfill topic owners and require owner_user_id on every topic.
-- All existing topics are assigned to the primary content admin.

do $$
declare
  v_owner_id uuid := '96434362-a141-4d8a-9cc3-92746b7f490b';
begin
  if not exists (
    select 1
    from auth.users
    where id = v_owner_id
  ) then
    raise exception
      'Owner user % not found in auth.users. Log in once with that account before running this migration.',
      v_owner_id;
  end if;

  update public.topics
  set owner_user_id = v_owner_id;
end $$;

comment on column public.topics.owner_user_id is
  'Supabase Auth user who owns this topic. Required for all topics.';

alter table public.topics
  alter column owner_user_id set not null;

-- Intentionally no FK to auth.users (breaks Supabase Table Editor for many projects).

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

drop policy if exists "topics_insert" on public.topics;
drop policy if exists "topics_update" on public.topics;

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
