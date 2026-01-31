-- Enable functionality for INVITES_V2 (1 Household per User)
-- We need to ensure users can DELETE their own row in household_members to "leave" a household.

-- 1. Check if policy exists or create it
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'household_members' 
        and policyname = 'Users can leave their own household'
    ) then
        create policy "Users can leave their own household"
            on public.household_members
            for delete
            using (auth.uid() = user_id);
    end if;
end
$$;

-- 2. Ensure they can SELECT their own memberships (usually already exists, but good to ensure)
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'household_members' 
        and policyname = 'Users can view their own memberships'
    ) then
        create policy "Users can view their own memberships"
            on public.household_members
            for select
            using (auth.uid() = user_id);
    end if;
end
$$;
