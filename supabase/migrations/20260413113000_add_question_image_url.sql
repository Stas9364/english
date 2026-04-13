alter table public.questions
add column if not exists question_image_url text;

comment on column public.questions.question_image_url
is 'Optional public URL for question image (stored in Storage folder questions/)';
