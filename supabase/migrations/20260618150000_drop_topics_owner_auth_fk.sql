-- Supabase Table Editor often fails on tables with FK to auth.users
-- (cannot resolve / permission on auth schema). Keep owner_user_id as uuid;
-- integrity is enforced by app + RLS, not a database foreign key.

alter table public.topics
  drop constraint if exists topics_owner_user_id_fkey;

comment on column public.topics.owner_user_id is
  'Supabase Auth user id (auth.users.id). No FK: keeps Dashboard Table Editor working.';
