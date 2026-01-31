-- Create Invitations Table
create table if not exists public.household_invitations (
    id uuid primary key default uuid_generate_v4(),
    household_id uuid references public.households(id) on delete cascade not null,
    invited_email text not null,
    token_hash text not null, -- Stores SHA256 of the token
    invited_by uuid references auth.users(id) not null,
    created_at timestamp with time zone default now(),
    expires_at timestamp with time zone not null,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,

    -- Constraints
    constraint email_lowercase_check check (invited_email = lower(invited_email))
);

-- Partial index to avoid duplicate active invitations
create unique index if not exists idx_unique_active_invitation 
on public.household_invitations(invited_email, household_id) 
where accepted_at is null and revoked_at is null;

-- RLS
alter table public.household_invitations enable row level security;

-- Policies for Admins
create policy "Admins can view invitations" 
    on public.household_invitations for select 
    using (exists (
        select 1 from public.household_members 
        where household_id = household_invitations.household_id 
        and user_id = auth.uid() 
        and role = 'admin'
    ));

create policy "Admins can create invitations" 
    on public.household_invitations for insert 
    with check (exists (
        select 1 from public.household_members 
        where household_id = household_invitations.household_id 
        and user_id = auth.uid() 
        and role = 'admin'
    ));

create policy "Admins can update (revoke) invitations" 
    on public.household_invitations for update 
    using (exists (
        select 1 from public.household_members 
        where household_id = household_invitations.household_id 
        and user_id = auth.uid() 
        and role = 'admin'
    ));

-- Policy for Public/Invitee to "View" (validate) their own invitation?
-- Actually, we'll validate via Server Action with SECURITY DEFINER or specialized query.
-- Standard 'select' RLS blocks anonymous/other users.
-- When accepting, the user is logged in. 
-- We allow "Select own invitation by token_hash?" -> No, token_hash is secret-ish? 
-- The user has the raw token. We hash it and query.
-- We can add a policy for the invitee if needed, OR run the verification in a secure function.
-- Let's stick to Admin policies for management UI. The acceptance check will bypass RLS or use a specific policy if we match email.
-- Let's add policy: Invitee can view if email matches (for validation UI)
-- But user might not be logged in yet? No, they must log in to accept.
create policy "Invitee can view their own (by email)"
    on public.household_invitations for select
    using (invited_email = (select lower(email) from auth.users where id = auth.uid()));
