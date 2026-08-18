-- Break-glass link registry: persisted in Supabase when the app is deployed
-- (localhost dev stays ephemeral). Enables early revocation of stateless HMAC
-- tokens and an issuance audit trail (who minted, when, for whom, final status).

create table if not exists public.break_glass_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  mrn text not null,
  url text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null
);

alter table public.break_glass_links enable row level security;

create policy "clinicians insert own links" on public.break_glass_links
  for insert to authenticated with check (auth.uid() = created_by);

create policy "clinicians read own links" on public.break_glass_links
  for select to authenticated using (auth.uid() = created_by);

create policy "clinicians update own links" on public.break_glass_links
  for update to authenticated using (auth.uid() = created_by);
