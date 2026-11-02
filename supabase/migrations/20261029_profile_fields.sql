alter table public.customer_profiles add column if not exists city text;
alter table public.customer_profiles add column if not exists preferred_contact text not null default 'email';
