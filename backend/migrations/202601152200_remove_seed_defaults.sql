-- Remove hardcoded default config seeds for new agencies.
drop trigger if exists on_agency_created on public.agencies;
drop function if exists public.handle_new_agency();
drop function if exists public.seed_agency_defaults(uuid);
