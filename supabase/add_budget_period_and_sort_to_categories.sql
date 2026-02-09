-- Add budgeting cadence and manual ordering for categories
alter table categories
add column if not exists budget_period_months integer not null default 1;

alter table categories
add constraint categories_budget_period_months_check
check (budget_period_months in (1, 2, 3, 12));

alter table categories
add column if not exists sort_order integer;

-- Backfill deterministic ordering by name when null
with ordered as (
  select id, row_number() over (partition by household_id, type order by name, created_at) as rn
  from categories
)
update categories c
set sort_order = o.rn
from ordered o
where c.id = o.id
  and c.sort_order is null;
