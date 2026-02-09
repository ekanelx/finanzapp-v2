-- Add periodicity to categories (monthly, bimonthly, quarterly, yearly)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS periodicity text CHECK (periodicity IN ('monthly', 'bimonthly', 'quarterly', 'yearly')) DEFAULT 'monthly';

-- Add sort_order for drag and drop
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
