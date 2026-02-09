-- Enable UUID
create extension if not exists "uuid-ossp";

-- 1. Households
create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users(id) not null
);

-- 2. Household Members (Updated for Virtual Members)
create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade, -- Nullable for virtual members
  nickname text, -- Display name for virtual members (or override)
  role text check (role in ('admin', 'member')) default 'member',
  joined_at timestamp with time zone default now(),
  unique(household_id, user_id) -- Unique constraint only applies if user_id is not null (Postgres default). 
  -- Warning: access patterns might rely on (household_id, user_id). 
  -- For virtual members, user_id is null. We might want unique(household_id, nickname) if virtual? 
  -- v1 migration "allow_virtual_members.sql" just dropped NOT NULL. It didn't change constraints.
);
create index idx_household_members_household_id on public.household_members(household_id);
create index idx_household_members_user_id on public.household_members(user_id);

-- 3. Categories
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  type text check (type in ('income', 'expense')) not null,
  icon text,
  created_at timestamp with time zone default now()
);

-- 4. Budgets
create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  month date not null,
  status text check (status in ('active', 'closed')) default 'active',
  created_at timestamp with time zone default now(),
  unique(household_id, month)
);
create index idx_budgets_household_month on public.budgets(household_id, month);

-- 5. Budget Lines
create table public.budget_lines (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references public.budgets(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  scope text check (scope in ('shared', 'member')) default 'shared' not null,
  member_id uuid references public.household_members(id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  constraint budget_lines_scope_check check (
    (scope = 'shared' and member_id is null) or
    (scope = 'member' and member_id is not null)
  ),
  unique(budget_id, category_id, scope, member_id)
);

-- 6. Transactions
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  user_id uuid references auth.users(id),
  amount numeric(10, 2) not null,
  description text,
  date date not null default current_date,
  type text check (type in ('income', 'expense')) not null,
  scope text check (scope in ('shared', 'member')) default 'shared' not null,
  member_id uuid references public.household_members(id) on delete set null,
  created_at timestamp with time zone default now(),
  constraint transactions_scope_check check (
    (scope = 'shared' and member_id is null) or
    (scope = 'member' and member_id is not null)
  )
);
create index idx_transactions_household_date on public.transactions(household_id, date);

-- 7. Goals
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  target_amount numeric(10, 2),
  current_amount numeric(10, 2) default 0,
  deadline date,
  created_at timestamp with time zone default now()
);

-- 8. Goal Contributions
create table public.goal_contributions (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid references public.goals(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  amount numeric(10, 2) not null,
  date date default current_date
);

-- 9. Investment Products (From Investments Schema)
create table public.investment_products (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  platform text,
  category text check (category in ('crypto', 'stock', 'fi', 'real_estate', 'other')) default 'other',
  symbol text,
  fixed_rate numeric(10, 4),
  current_balance numeric(15, 2),
  created_at timestamp with time zone default now()
);

-- 10. Investment Contributions (From Investments Schema)
create table public.investment_contributions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  product_id uuid references public.investment_products(id) on delete cascade not null,
  member_id uuid references public.household_members(id) on delete cascade not null,
  date date not null default current_date,
  amount numeric(10, 2) not null check (amount > 0),
  type text check (type in ('deposit', 'withdrawal', 'yield')) default 'deposit',
  created_at timestamp with time zone default now()
);
create index idx_investment_products_household on public.investment_products(household_id);
create index idx_investment_contributions_household_date on public.investment_contributions(household_id, date);
create index idx_investment_contributions_product on public.investment_contributions(product_id);
create index idx_investment_contributions_member on public.investment_contributions(member_id);

-- TRIGGERS

create or replace function public.handle_new_household()
returns trigger as $$
begin
  set search_path = public;
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_household_created
  after insert on public.households
  for each row execute procedure public.handle_new_household();

create or replace function public.handle_goal_contribution()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.goals set current_amount = current_amount + new.amount where id = new.goal_id;
  elsif (TG_OP = 'DELETE') then
    update public.goals set current_amount = current_amount - old.amount where id = old.goal_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_goal_contribution_change
  after insert or delete on public.goal_contributions
  for each row execute procedure public.handle_goal_contribution();

-- RLS POLICIES

-- Helper
create or replace function public.is_household_member(household_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members
    where household_id = household_uuid
    and (
       user_id = auth.uid() -- Matches real user
       -- Virtual members: cannot query "is member" based on auth.uid() directly if user_id is null.
       -- But RLS context is "auth.uid()". Virtual members don't make requests.
       -- Real members (users) query data. They must be a member of the household.
    )
  );
$$ language sql security definer;

-- 1. Households
alter table public.households enable row level security;
create policy "Select households where member" on public.households for select using (public.is_household_member(id));
create policy "Insert households" on public.households for insert with check (auth.uid() = created_by);
create policy "Update households if admin" on public.households for update using (exists (select 1 from public.household_members where household_id = households.id and user_id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.household_members where household_id = households.id and user_id = auth.uid() and role = 'admin'));

-- 2. Household Members
alter table public.household_members enable row level security;
create policy "View members of my households" on public.household_members for select using (exists (select 1 from public.household_members hm where hm.household_id = household_members.household_id and hm.user_id = auth.uid()));

-- 3. Categories
alter table public.categories enable row level security;
create policy "Select categories" on public.categories for select using (public.is_household_member(household_id));
create policy "Insert categories" on public.categories for insert with check (public.is_household_member(household_id));
create policy "Update categories" on public.categories for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Delete categories" on public.categories for delete using (public.is_household_member(household_id));

-- 4. Budgets
alter table public.budgets enable row level security;
create policy "Select budgets" on public.budgets for select using (public.is_household_member(household_id));
create policy "Insert budgets" on public.budgets for insert with check (public.is_household_member(household_id));
create policy "Update budgets" on public.budgets for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Delete budgets" on public.budgets for delete using (public.is_household_member(household_id));

-- 5. Budget Lines
alter table public.budget_lines enable row level security;
create policy "Select budget lines" on public.budget_lines for select using (exists (select 1 from public.budgets where id = budget_lines.budget_id and public.is_household_member(household_id)));
create policy "Insert budget lines" on public.budget_lines for insert with check (exists (select 1 from public.budgets where id = budget_lines.budget_id and public.is_household_member(household_id)));
create policy "Update budget lines" on public.budget_lines for update using (exists (select 1 from public.budgets where id = budget_lines.budget_id and public.is_household_member(household_id))) with check (exists (select 1 from public.budgets where id = budget_lines.budget_id and public.is_household_member(household_id)));
create policy "Delete budget lines" on public.budget_lines for delete using (exists (select 1 from public.budgets where id = budget_lines.budget_id and public.is_household_member(household_id)));

-- 6. Transactions
alter table public.transactions enable row level security;
create policy "Select transactions" on public.transactions for select using (public.is_household_member(household_id));
create policy "Insert transactions" on public.transactions for insert with check (public.is_household_member(household_id));
create policy "Update transactions" on public.transactions for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Delete transactions" on public.transactions for delete using (public.is_household_member(household_id));

-- 7. Goals
alter table public.goals enable row level security;
create policy "Select goals" on public.goals for select using (public.is_household_member(household_id));
create policy "Insert goals" on public.goals for insert with check (public.is_household_member(household_id));
create policy "Update goals" on public.goals for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Delete goals" on public.goals for delete using (public.is_household_member(household_id));

-- 8. Goal Contributions
alter table public.goal_contributions enable row level security;
create policy "Select contributions" on public.goal_contributions for select using (exists (select 1 from public.goals where id = goal_contributions.goal_id and public.is_household_member(household_id)));
create policy "Insert contributions" on public.goal_contributions for insert with check (exists (select 1 from public.goals where id = goal_contributions.goal_id and public.is_household_member(household_id)));
create policy "Update contributions" on public.goal_contributions for update using (exists (select 1 from public.goals where id = goal_contributions.goal_id and public.is_household_member(household_id))) with check (exists (select 1 from public.goals where id = goal_contributions.goal_id and public.is_household_member(household_id)));
create policy "Delete contributions" on public.goal_contributions for delete using (exists (select 1 from public.goals where id = goal_contributions.goal_id and public.is_household_member(household_id)));

-- 9. Investment Products (Investments RLS)
alter table public.investment_products enable row level security;
create policy "Select investment products" on public.investment_products for select using (public.is_household_member(household_id));
create policy "Insert investment products" on public.investment_products for insert with check (public.is_household_member(household_id));
create policy "Update investment products" on public.investment_products for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Delete investment products" on public.investment_products for delete using (public.is_household_member(household_id));

-- 10. Investment Contributions (Investments RLS)
alter table public.investment_contributions enable row level security;
create policy "Select investment contributions" on public.investment_contributions for select using (public.is_household_member(household_id));
create policy "Insert investment contributions" on public.investment_contributions for insert with check (public.is_household_member(household_id));
create policy "Update investment contributions" on public.investment_contributions for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "Delete investment contributions" on public.investment_contributions for delete using (public.is_household_member(household_id));
