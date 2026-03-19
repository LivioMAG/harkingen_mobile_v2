-- Rapport Mobile / Supabase Setup
-- 1) Dieses SQL im Supabase SQL Editor ausführen.
-- 2) Danach Bucket "weekly-attachments" in Storage anlegen (oder das SQL unten mit ausführen).
-- 3) Anschliessend supabase-config.json mit URL + anon key befüllen.
-- 4) Admins werden ausschliesslich direkt in Supabase gesetzt: app_profiles.is_admin = true.

create extension if not exists "pgcrypto";

create table if not exists public.app_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  role_label text not null default 'Monteur',
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_profiles add column if not exists first_name text not null default '';
alter table public.app_profiles add column if not exists last_name text not null default '';
alter table public.app_profiles add column if not exists full_name text not null default '';
alter table public.app_profiles add column if not exists role_label text not null default 'Monteur';
alter table public.app_profiles add column if not exists is_admin boolean not null default false;

update public.app_profiles
set
  first_name = case
    when coalesce(trim(first_name), '') <> '' then trim(first_name)
    when coalesce(trim(split_part(full_name, ' ', 1)), '') <> '' then trim(split_part(full_name, ' ', 1))
    else trim(coalesce(full_name, ''))
  end,
  last_name = case
    when coalesce(trim(last_name), '') <> '' then trim(last_name)
    when strpos(trim(coalesce(full_name, '')), ' ') > 0 then trim(substr(trim(coalesce(full_name, '')), strpos(trim(coalesce(full_name, '')), ' ') + 1))
    else ''
  end,
  full_name = trim(concat_ws(' ', nullif(trim(first_name), ''), nullif(trim(last_name), '')))
where true;

update public.app_profiles
set full_name = trim(concat_ws(' ', nullif(trim(first_name), ''), nullif(trim(last_name), '')))
where coalesce(trim(full_name), '') = '';

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

create or replace function public.normalize_app_profile()
returns trigger
language plpgsql
as $$
begin
  new.first_name := trim(coalesce(new.first_name, ''));
  new.last_name := trim(coalesce(new.last_name, ''));
  new.full_name := trim(concat_ws(' ', nullif(new.first_name, ''), nullif(new.last_name, '')));
  new.role_label := coalesce(nullif(trim(new.role_label), ''), 'Monteur');

  if tg_op = 'UPDATE' then
    new.email := lower(trim(coalesce(new.email, old.email)));
    new.is_admin := coalesce(new.is_admin, old.is_admin, false);

    if new.email is distinct from old.email then
      raise exception 'E-Mail kann nicht über die App geändert werden.';
    end if;

    if new.is_admin is distinct from old.is_admin then
      raise exception 'Admin-Status kann nur direkt in Supabase geändert werden.';
    end if;
  else
    new.email := lower(trim(new.email));
    new.is_admin := coalesce(new.is_admin, false);
  end if;

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select ap.is_admin
    from public.app_profiles ap
    where ap.id = auth.uid()
  ), false);
$$;

drop trigger if exists set_app_profiles_updated_at on public.app_profiles;
create trigger set_app_profiles_updated_at
before update on public.app_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists normalize_app_profile on public.app_profiles;
create trigger normalize_app_profile
before insert or update on public.app_profiles
for each row execute procedure public.normalize_app_profile();

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
-- Admin-Status gibt hier bewusst KEINEN Vollzugriff, damit Profile separat geschützt bleiben.
drop policy if exists "profiles_select_own" on public.app_profiles;
create policy "profiles_select_own"
  on public.app_profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.app_profiles;
create policy "profiles_insert_own"
  on public.app_profiles
  for insert
  with check (auth.uid() = id and coalesce(is_admin, false) = false);

drop policy if exists "profiles_update_own" on public.app_profiles;
create policy "profiles_update_own"
  on public.app_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Rapporte: Benutzer sehen ihre eigenen Einträge; Admins sehen und bearbeiten alle.
drop policy if exists "reports_select_own" on public.weekly_reports;
drop policy if exists "reports_insert_own" on public.weekly_reports;
drop policy if exists "reports_update_own" on public.weekly_reports;
drop policy if exists "reports_delete_own" on public.weekly_reports;
drop policy if exists "reports_select_own_or_admin" on public.weekly_reports;
create policy "reports_select_own_or_admin"
  on public.weekly_reports
  for select
  using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "reports_insert_own_or_admin" on public.weekly_reports;
create policy "reports_insert_own_or_admin"
  on public.weekly_reports
  for insert
  with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists "reports_update_own_or_admin" on public.weekly_reports;
create policy "reports_update_own_or_admin"
  on public.weekly_reports
  for update
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists "reports_delete_own_or_admin" on public.weekly_reports;
create policy "reports_delete_own_or_admin"
  on public.weekly_reports
  for delete
  using (auth.uid() = profile_id or public.is_admin());

-- Abwesenheiten: Benutzer sehen ihre eigenen Anträge; Admins sehen und bearbeiten alle.
drop policy if exists "holiday_select_own" on public.holiday_requests;
drop policy if exists "holiday_insert_own" on public.holiday_requests;
drop policy if exists "holiday_update_own" on public.holiday_requests;
drop policy if exists "holiday_delete_own" on public.holiday_requests;
drop policy if exists "holiday_select_own_or_admin" on public.holiday_requests;
create policy "holiday_select_own_or_admin"
  on public.holiday_requests
  for select
  using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "holiday_insert_own_or_admin" on public.holiday_requests;
create policy "holiday_insert_own_or_admin"
  on public.holiday_requests
  for insert
  with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists "holiday_update_own_or_admin" on public.holiday_requests;
create policy "holiday_update_own_or_admin"
  on public.holiday_requests
  for update
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists "holiday_delete_own_or_admin" on public.holiday_requests;
create policy "holiday_delete_own_or_admin"
  on public.holiday_requests
  for delete
  using (auth.uid() = profile_id or public.is_admin());

insert into storage.buckets (id, name, public)
values ('weekly-attachments', 'weekly-attachments', true)
on conflict (id) do nothing;

-- Storage-Regeln: Benutzer dürfen nur im eigenen Ordner arbeiten.
-- Admins dürfen alle Dateien im Bucket lesen, hochladen, aktualisieren und löschen.
drop policy if exists "storage_read_own_weekly_attachments" on storage.objects;
drop policy if exists "storage_insert_own_weekly_attachments" on storage.objects;
drop policy if exists "storage_update_own_weekly_attachments" on storage.objects;
drop policy if exists "storage_delete_own_weekly_attachments" on storage.objects;
drop policy if exists "storage_read_weekly_attachments_own_or_admin" on storage.objects;
create policy "storage_read_weekly_attachments_own_or_admin"
  on storage.objects
  for select
  using (
    bucket_id = 'weekly-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

drop policy if exists "storage_insert_weekly_attachments_own_or_admin" on storage.objects;
create policy "storage_insert_weekly_attachments_own_or_admin"
  on storage.objects
  for insert
  with check (
    bucket_id = 'weekly-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

drop policy if exists "storage_update_weekly_attachments_own_or_admin" on storage.objects;
create policy "storage_update_weekly_attachments_own_or_admin"
  on storage.objects
  for update
  using (
    bucket_id = 'weekly-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'weekly-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

drop policy if exists "storage_delete_weekly_attachments_own_or_admin" on storage.objects;
create policy "storage_delete_weekly_attachments_own_or_admin"
  on storage.objects
  for delete
  using (
    bucket_id = 'weekly-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );
