-- Admin roles live in auth.users.raw_app_meta_data.role (JWT app_metadata.role).
-- Values: admin | super_admin. admin_emails remains a legacy fallback for is_admin().

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin'),
    false
  )
  or exists (
    select 1
    from public.admin_emails
    where email ilike (auth.jwt() ->> 'email')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
    false
  );
$$;

grant execute on function public.is_super_admin() to anon, authenticated, service_role;
