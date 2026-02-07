-- Add account_type to clients and require client_number

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE public.account_type AS ENUM ('term', 'cash');
  END IF;
END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'term';

-- Backfill missing client numbers (tests only)
UPDATE public.clients
SET client_number = '000001'
WHERE client_number IS NULL OR client_number = '';

ALTER TABLE public.clients
  ALTER COLUMN client_number SET NOT NULL;
