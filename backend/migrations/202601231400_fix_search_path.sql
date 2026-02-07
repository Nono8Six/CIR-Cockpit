-- Fix mutable search_path on security-sensitive functions (Supabase linter)
-- Best practice: SET search_path = '' to prevent schema injection.

ALTER FUNCTION public.safe_uuid(text) SET search_path = '';
ALTER FUNCTION public.jwt_sub() SET search_path = '';
ALTER FUNCTION public.app_actor_id() SET search_path = '';
ALTER FUNCTION public.audit_actor_id() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
