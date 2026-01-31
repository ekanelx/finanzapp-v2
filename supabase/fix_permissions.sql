-- Fix permissions for Investment tables
GRANT ALL ON TABLE public.investment_products TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.investment_contributions TO postgres, anon, authenticated, service_role;

-- Ensure RLS is enabled
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_contributions ENABLE ROW LEVEL SECURITY;

-- Note: Policies usually exist, but if "permission denied" occurs, chances are grants are missing.
