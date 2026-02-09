-- Add fields to investment_products
ALTER TABLE public.investment_products 
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('crypto', 'stock', 'fi', 'real_estate', 'other')) DEFAULT 'other';

ALTER TABLE public.investment_products 
ADD COLUMN IF NOT EXISTS symbol text;

ALTER TABLE public.investment_products 
ADD COLUMN IF NOT EXISTS fixed_rate numeric(10, 4);

ALTER TABLE public.investment_products 
ADD COLUMN IF NOT EXISTS current_balance numeric(15, 2);

-- Add fields to investment_contributions
ALTER TABLE public.investment_contributions 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('deposit', 'withdrawal', 'yield')) DEFAULT 'deposit';
