-- Add type column to budget_lines if it doesn't exist
alter table budget_lines 
add column if not exists type text default 'expense';

-- Add check constraint for type
alter table budget_lines 
drop constraint if exists budget_lines_type_check;

alter table budget_lines 
add constraint budget_lines_type_check check (type in ('income', 'expense'));
