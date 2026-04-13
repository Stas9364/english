-- Раздел админки для темы: grammar, vocabulary, … (валидный список в приложении)

alter table public.topics
add column if not exists chapter text not null default 'grammar';

comment on column public.topics.chapter is 'Admin section key, e.g. grammar, vocabulary';

create index if not exists topics_chapter_order_idx on public.topics (chapter, order_index);
