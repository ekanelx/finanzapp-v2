# Finanzapp v2

Rebuild of the Finanzapp MVP - A collaborative Personal Finance Manager for Households.

## Overview
Finanzapp allows users to manage their household finances with a "Zero-Based Budgeting" philosophy. It supports real-time synchronization between members, shared budgets, goal tracking, and investment portfolio monitoring.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (SSR)
- **UI**: shadcn/ui + Tailwind CSS v4
- **State/Data**: Server Actions + Supabase Realtime (Server-side fetching primary)

## Key Features
- **Households**: Users belong to a household. Validated via `household_members`.
- **Transactions**: Income/Expense tracking with categories.
- **Budgets**: Monthly budget setting per category (Zero-Based).
- **Goals**: Collaborative savings goals with contribution history.
- **Investments**: Portfolio tracking for assets (Manual entry).
- **Virtual Members**: Add "pseudo-members" (nodes) to track spending for children or pets without an account.

## Setup Instructions

1. **Clone & Install**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Database**
   Apply the schema from `supabase/schema.sql`.

4. **Run Development**
   ```bash
   pnpm dev
   ```

## Architecture Notes
- All data access is protected by RLS (Row Level Security) enforcing `household_id`.
- "Deny by default" policy.
- Middleware handles session refreshing and protected route referencing.
