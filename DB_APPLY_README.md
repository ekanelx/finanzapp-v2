# Database Application Guide

To ensure the database is correctly set up for the Investments module (and the entire app), follow these steps:

## 1. Reset & Apply Schema (Optional but Recommended)
If you are in a development environment and can afford to lose data:
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Copy the content of `supabase/dev_reset.sql` and run it. This will drop all tables.
3. Copy the content of `supabase/schema.sql` and run it. This recreates all tables, including `investment_products` and `investment_contributions`.

## 2. Verify Tables
Go to the **Table Editor** in Supabase and confirm the following tables exist:
- `investment_products`
  - Columns: `id`, `household_id`, `name`, `platform`, `created_at`
- `investment_contributions`
  - Columns: `id`, `household_id`, `product_id`, `member_id`, `date`, `amount`, `created_at`

## 3. Verify RLS Policies
In the **Authentication > Policies** section, check that both tables have 4 policies each (SELECT, INSERT, UPDATE, DELETE) generally using logic like `is_household_member(household_id)`.

## 4. Logical Verification
The application logic in `src/app/(dashboard)/investments/actions.ts` has been updated to log payloads. When you use the app:
- Check the server console (terminal where `pnpm dev` is running).
- Look for logs starting with `[createInvestmentProduct]` or `[addContribution]`.
