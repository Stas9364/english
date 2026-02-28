-- Правильные текстовые ответы хранятся в options (по одной строке на вариант)
alter table public.questions drop column if exists correct_answer_text;
