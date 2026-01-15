# Supabase backend (draft)

## Environment

Create a `.env.local` file with:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The UI will fall back to local storage if the Supabase variables are missing.

## Core tables

```sql
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create type public.user_role as enum ('super_admin', 'agency_admin', 'tcs');

create table public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create table public.interactions (
  id text primary key,
  agency_id uuid references public.agencies(id) on delete set null,
  created_at timestamptz not null,
  channel text not null,
  lead_source text not null,
  supplier_ref text,
  entity_type text not null,
  contact_service text not null,
  company_name text not null,
  contact_name text not null,
  contact_phone text not null,
  mega_families text[] not null,
  subject text not null,
  order_ref text,
  status text not null,
  reminder_at timestamptz,
  notes text,
  timeline jsonb not null
);
```

## Row Level Security (outline)

- `super_admin` can read/write everything.
- `agency_admin` can read/write data within their agency.
- `tcs` can read/write interactions within their agency.

```sql
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.profiles enable row level security;
alter table public.interactions enable row level security;
```

> Note: `profiles` should be created via a trigger on `auth.users` and `super_admin`
> accounts should be created manually by the global administrator.
```
