-- Rapport Mobile / Supabase Setup
-- 1) Dieses SQL im Supabase SQL Editor ausführen.
-- 2) Danach Bucket "weekly-attachments" in Storage anlegen (oder das SQL unten mit ausführen).
-- 3) Anschliessend supabase-config.json mit URL + anon key befüllen.

create extension if not exists "pgcrypto";

create table if not exists public.app_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_label text not null default 'Monteur',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.app_profiles (id) on delete cascade,
  work_date date not null,
  commission_number text not null,
  start_time time not null default '07:00',
  end_time time not null default '17:30',
  lunch_break_minutes integer not null default 60,
  additional_break_minutes integer not null default 30,
  total_work_minutes integer not null default 0,
  expenses_amount numeric(10,2) not null default 0,
  other_costs_amount numeric(10,2) not null default 0,
  expense_note text,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.holiday_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.app_profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  request_type text not null check (request_type in ('ferien', 'militaer', 'zivildienst', 'unfall', 'krankheit')),
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint holiday_requests_date_check check (end_date >= start_date)
);

create index if not exists weekly_reports_profile_date_idx
  on public.weekly_reports (profile_id, work_date);

create index if not exists holiday_requests_profile_date_idx
  on public.holiday_requests (profile_id, start_date, end_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_app_profiles_updated_at on public.app_profiles;
create trigger set_app_profiles_updated_at
before update on public.app_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_weekly_reports_updated_at on public.weekly_reports;
create trigger set_weekly_reports_updated_at
before update on public.weekly_reports
for each row execute procedure public.set_updated_at();

drop trigger if exists set_holiday_requests_updated_at on public.holiday_requests;
create trigger set_holiday_requests_updated_at
before update on public.holiday_requests
for each row execute procedure public.set_updated_at();

alter table public.app_profiles enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.holiday_requests enable row level security;

-- Profile: Benutzer sieht und bearbeitet nur sein eigenes Profil.
drop policy if exists "profiles_select_own" on public.app_profiles;
create policy "profiles_select_own"
  on public.app_profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.app_profiles;
create policy "profiles_insert_own"
  on public.app_profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.app_profiles;
create policy "profiles_update_own"
  on public.app_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Rapporte: jeder Benutzer sieht und pflegt nur seine eigenen Einträge.
drop policy if exists "reports_select_own" on public.weekly_reports;
create policy "reports_select_own"
  on public.weekly_reports
  for select
  using (auth.uid() = profile_id);

drop policy if exists "reports_insert_own" on public.weekly_reports;
create policy "reports_insert_own"
  on public.weekly_reports
  for insert
  with check (auth.uid() = profile_id);

drop policy if exists "reports_update_own" on public.weekly_reports;
create policy "reports_update_own"
  on public.weekly_reports
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "reports_delete_own" on public.weekly_reports;
create policy "reports_delete_own"
  on public.weekly_reports
  for delete
  using (auth.uid() = profile_id);

-- Abwesenheiten: jeder Benutzer sieht und pflegt nur seine eigenen Anträge.
drop policy if exists "holiday_select_own" on public.holiday_requests;
create policy "holiday_select_own"
  on public.holiday_requests
  for select
  using (auth.uid() = profile_id);

drop policy if exists "holiday_insert_own" on public.holiday_requests;
create policy "holiday_insert_own"
  on public.holiday_requests
  for insert
  with check (auth.uid() = profile_id);

drop policy if exists "holiday_update_own" on public.holiday_requests;
create policy "holiday_update_own"
  on public.holiday_requests
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "holiday_delete_own" on public.holiday_requests;
create policy "holiday_delete_own"
  on public.holiday_requests
  for delete
  using (auth.uid() = profile_id);

insert into storage.buckets (id, name, public)
values ('weekly-attachments', 'weekly-attachments', true)
on conflict (id) do nothing;

-- Storage-Regeln: Benutzer dürfen nur im eigenen Ordner hochladen / lesen.
drop policy if exists "storage_read_own_weekly_attachments" on storage.objects;
create policy "storage_read_own_weekly_attachments"
  on storage.objects
  for select
  using (bucket_id = 'weekly-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "storage_insert_own_weekly_attachments" on storage.objects;
create policy "storage_insert_own_weekly_attachments"
  on storage.objects
  for insert
  with check (bucket_id = 'weekly-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "storage_update_own_weekly_attachments" on storage.objects;
create policy "storage_update_own_weekly_attachments"
  on storage.objects
  for update
  using (bucket_id = 'weekly-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "storage_delete_own_weekly_attachments" on storage.objects;
create policy "storage_delete_own_weekly_attachments"
  on storage.objects
  for delete
  using (bucket_id = 'weekly-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
