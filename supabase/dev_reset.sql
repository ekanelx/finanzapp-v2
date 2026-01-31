-- Explicit drops as requested
DROP TABLE IF EXISTS public.investment_contributions CASCADE;
DROP TABLE IF EXISTS public.investment_products CASCADE;

-- DANGEROUS: Wipes schema public and re-creates it.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Restore standard extensions
create extension if not exists "uuid-ossp";

-- Now allow user to paste schema.sql
