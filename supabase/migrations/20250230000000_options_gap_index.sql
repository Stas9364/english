-- For input-type questions with multiple [[]] gaps: each option row corresponds to one gap.
-- gap_index: 0-based index of the gap this answer belongs to (null = legacy single gap, treat as 0).

alter table public.options
  add column if not exists gap_index int;

comment on column public.options.gap_index is 'For input type: 0-based gap index. Null or 0 = first/single gap.';
