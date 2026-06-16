-- Daily unique visitor aggregates (global)
create table if not exists public.daily_visitor_stats (
  visit_date date primary key,
  unique_visitors integer not null default 0 check (unique_visitors >= 0),
  updated_at timestamptz not null default now()
);

-- Daily unique visitor aggregates per quiz
create table if not exists public.daily_quiz_visitor_stats (
  visit_date date not null,
  quiz_slug text not null references public.quizzes (slug) on delete cascade,
  unique_visitors integer not null default 0 check (unique_visitors >= 0),
  updated_at timestamptz not null default now(),
  primary key (visit_date, quiz_slug)
);

create index if not exists daily_quiz_visitor_stats_quiz_slug_idx
  on public.daily_quiz_visitor_stats (quiz_slug);

-- Ephemeral dedup: one row per visitor fingerprint per day (no raw IP)
create table if not exists public.daily_visitor_dedup (
  visit_date date not null,
  visitor_fingerprint text not null,
  primary key (visit_date, visitor_fingerprint)
);

-- Ephemeral dedup: one row per visitor fingerprint per quiz per day
create table if not exists public.daily_quiz_visitor_dedup (
  visit_date date not null,
  visitor_fingerprint text not null,
  quiz_slug text not null references public.quizzes (slug) on delete cascade,
  primary key (visit_date, visitor_fingerprint, quiz_slug)
);

alter table public.daily_visitor_stats enable row level security;
alter table public.daily_quiz_visitor_stats enable row level security;
alter table public.daily_visitor_dedup enable row level security;
alter table public.daily_quiz_visitor_dedup enable row level security;

create policy "daily_visitor_stats_select"
  on public.daily_visitor_stats
  for select
  using (public.is_admin());

create policy "daily_quiz_visitor_stats_select"
  on public.daily_quiz_visitor_stats
  for select
  using (public.is_admin());

-- Dedup tables: no client policies; writes only via SECURITY DEFINER RPC

create or replace function public.record_quiz_visit(
  p_date date,
  p_fingerprint text,
  p_quiz_slug text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_global_inserted integer;
  v_quiz_inserted integer;
begin
  if p_fingerprint is null or length(btrim(p_fingerprint)) = 0 then
    return;
  end if;

  if p_quiz_slug is null or length(btrim(p_quiz_slug)) = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.quizzes q
    where q.slug = p_quiz_slug
  ) then
    return;
  end if;

  delete from public.daily_visitor_dedup
  where visit_date < p_date;

  delete from public.daily_quiz_visitor_dedup
  where visit_date < p_date;

  insert into public.daily_visitor_dedup (visit_date, visitor_fingerprint)
  values (p_date, p_fingerprint)
  on conflict do nothing;

  get diagnostics v_global_inserted = row_count;

  if v_global_inserted > 0 then
    insert into public.daily_visitor_stats (visit_date, unique_visitors)
    values (p_date, 1)
    on conflict (visit_date)
    do update set
      unique_visitors = daily_visitor_stats.unique_visitors + 1,
      updated_at = now();
  end if;

  insert into public.daily_quiz_visitor_dedup (visit_date, visitor_fingerprint, quiz_slug)
  values (p_date, p_fingerprint, p_quiz_slug)
  on conflict do nothing;

  get diagnostics v_quiz_inserted = row_count;

  if v_quiz_inserted > 0 then
    insert into public.daily_quiz_visitor_stats (visit_date, quiz_slug, unique_visitors)
    values (p_date, p_quiz_slug, 1)
    on conflict (visit_date, quiz_slug)
    do update set
      unique_visitors = daily_quiz_visitor_stats.unique_visitors + 1,
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.record_quiz_visit(date, text, text) from public;
grant execute on function public.record_quiz_visit(date, text, text) to service_role;

grant select on table public.daily_visitor_stats to anon, authenticated, service_role;
grant select on table public.daily_quiz_visitor_stats to anon, authenticated, service_role;

grant all on table public.daily_visitor_stats to service_role;
grant all on table public.daily_quiz_visitor_stats to service_role;
grant all on table public.daily_visitor_dedup to service_role;
grant all on table public.daily_quiz_visitor_dedup to service_role;
