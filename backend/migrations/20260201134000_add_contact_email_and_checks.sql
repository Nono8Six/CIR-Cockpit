-- Add contact_email and enforce phone/email requirements

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS contact_email text;

UPDATE public.interactions
SET contact_phone = '0000000000'
WHERE contact_phone IS NULL OR btrim(contact_phone) = '';

ALTER TABLE public.interactions
  ALTER COLUMN contact_phone DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interactions_contact_phone_or_email'
  ) THEN
    ALTER TABLE public.interactions
      ADD CONSTRAINT interactions_contact_phone_or_email
      CHECK (
        (contact_phone IS NOT NULL AND btrim(contact_phone) <> '') OR
        (contact_email IS NOT NULL AND btrim(contact_email) <> '')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_contacts_phone_or_email'
  ) THEN
    ALTER TABLE public.client_contacts
      ADD CONSTRAINT client_contacts_phone_or_email
      CHECK (
        (phone IS NOT NULL AND btrim(phone) <> '') OR
        (email IS NOT NULL AND btrim(email) <> '')
      );
  END IF;
END $$;
