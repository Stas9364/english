-- RLS: чтение тестов/вопросов/вариантов — всем, запись — только админам из admin_emails

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.admin_emails enable row level security;

-- Функция: текущий пользователь — админ (его email есть в admin_emails)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.admin_emails
    where email = auth.jwt() ->> 'email'
  );
$$;

-- quizzes: читать все, писать только админы
create policy "quizzes_select" on public.quizzes for select using (true);
create policy "quizzes_insert" on public.quizzes for insert with check (public.is_admin());
create policy "quizzes_update" on public.quizzes for update using (public.is_admin());
create policy "quizzes_delete" on public.quizzes for delete using (public.is_admin());

-- questions: читать все, писать только админы
create policy "questions_select" on public.questions for select using (true);
create policy "questions_insert" on public.questions for insert with check (public.is_admin());
create policy "questions_update" on public.questions for update using (public.is_admin());
create policy "questions_delete" on public.questions for delete using (public.is_admin());

-- options: читать все, писать только админы
create policy "options_select" on public.options for select using (true);
create policy "options_insert" on public.options for insert with check (public.is_admin());
create policy "options_update" on public.options for update using (public.is_admin());
create policy "options_delete" on public.options for delete using (public.is_admin());

-- admin_emails: читать может только админ (для проверки is_admin), вставка/изменение — только через Dashboard (service_role)
create policy "admin_emails_select" on public.admin_emails for select using (public.is_admin());
-- INSERT/UPDATE/DELETE по admin_emails из приложения не разрешаем; первый админ добавляется вручную в Dashboard
