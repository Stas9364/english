-- Drop legacy polymorphic discriminator: chapters.entity_type.
-- chapters are now scoped by FK usage, so this column is redundant.

drop index if exists public.chapters_entity_type_order_idx;
drop index if exists public.chapters_entity_type_key_idx;

alter table public.chapters
drop column if exists entity_type;
