-- Grants
grant all on public.household_invitations to authenticated;
grant all on public.household_invitations to service_role;

-- Helper to safely check Admin status (Bypass RLS on members table)
create or replace function public.is_household_admin(household_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.household_members
    where household_id = household_uuid
    and user_id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Helper to safely get own email (Bypass auth schema restriction)
create or replace function public.get_my_email()
returns text as $$
begin
  return (select lower(email) from auth.users where id = auth.uid());
end;
$$ language plpgsql security definer;

-- Re-create Policies
alter table public.household_invitations enable row level security;

drop policy if exists "Admins can view invitations" on public.household_invitations;
drop policy if exists "Admins can create invitations" on public.household_invitations;
drop policy if exists "Admins can update (revoke) invitations" on public.household_invitations;
drop policy if exists "Invitee can view their own (by email)" on public.household_invitations;

-- 1. Admins View
create policy "Admins can view invitations" 
    on public.household_invitations for select 
    using (public.is_household_admin(household_id));

-- 2. Admins Insert
create policy "Admins can create invitations" 
    on public.household_invitations for insert 
    with check (public.is_household_admin(household_id));

-- 3. Admins Update (Revoke)
create policy "Admins can update (revoke) invitations" 
    on public.household_invitations for update 
    using (public.is_household_admin(household_id));

-- 4. Invitee View (Match Email)
create policy "Invitee can view their own (by email)"
    on public.household_invitations for select
    using (invited_email = public.get_my_email());
