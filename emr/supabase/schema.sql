-- Relief Motion EMR — run in the Supabase SQL editor.
-- Safe to re-run. Existing patients are not deleted.

create extension if not exists pgcrypto;

create sequence if not exists public.patient_rm_seq;

create or replace function public.next_rm_id()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.patient_rm_seq');
  return 'RM-' || to_char(timezone('utc', now()), 'YYYY') || '-' || lpad(n::text, 5, '0');
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'physiotherapist'
    check (role in ('admin', 'physiotherapist')),
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  rm_id text unique not null default public.next_rm_id(),
  first_name text not null,
  last_name text not null,
  phone text,
  city text,
  sex text,
  date_of_birth date,
  condition text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.patients add column if not exists address text;
alter table public.patients add column if not exists assigned_to uuid references public.profiles (id);
alter table public.patients add column if not exists status text not null default 'active';
alter table public.patients add column if not exists emergency_name text;
alter table public.patients add column if not exists emergency_phone text;
alter table public.patients add column if not exists referral_source text;
alter table public.patients add column if not exists medical_history text;

alter table public.patients drop constraint if exists patients_status_check;
alter table public.patients add constraint patients_status_check
  check (status in ('active', 'inactive'));

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  clinician_id uuid not null references public.profiles (id),
  visit_at date not null default (timezone('utc', now()))::date,
  visit_type text not null check (visit_type in ('home', 'online')),
  findings text,
  treatment text,
  plan text,
  created_at timestamptz not null default now()
);

alter table public.visits add column if not exists visit_time time;
alter table public.visits add column if not exists status text not null default 'signed';
alter table public.visits add column if not exists subjective text;
alter table public.visits add column if not exists objective text;
alter table public.visits add column if not exists assessment text;
alter table public.visits add column if not exists patient_response text;
alter table public.visits add column if not exists additional_notes text;

alter table public.visits drop constraint if exists visits_status_check;
alter table public.visits add constraint visits_status_check
  check (status in ('draft', 'signed'));

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action text not null,
  patient_id uuid references public.patients (id) on delete set null,
  visit_id uuid references public.visits (id) on delete set null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  filename text not null,
  storage_path text not null,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'physiotherapist'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.audit_events enable row level security;
alter table public.patient_documents enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_access_patient(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target is not null
    and (
      public.is_admin()
      or exists (
        select 1 from public.patients p
        where p.id = target and p.assigned_to = auth.uid()
      )
    );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.can_access_patient(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.can_access_patient(uuid) to anon, authenticated, service_role;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "staff update own profile" on public.profiles;
create policy "staff update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "staff read patients" on public.patients;
drop policy if exists "read assigned or all if admin" on public.patients;
create policy "read assigned or all if admin"
  on public.patients for select
  to authenticated
  using (public.is_admin() or assigned_to = auth.uid());

drop policy if exists "staff create patients" on public.patients;
create policy "staff create patients"
  on public.patients for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_admin() or assigned_to = auth.uid())
  );

drop policy if exists "staff update patients" on public.patients;
drop policy if exists "update assigned or all if admin" on public.patients;
create policy "update assigned or all if admin"
  on public.patients for update
  to authenticated
  using (public.is_admin() or assigned_to = auth.uid())
  with check (public.is_admin() or assigned_to = auth.uid());

drop policy if exists "staff read visits" on public.visits;
drop policy if exists "read visits for accessible patients" on public.visits;
create policy "read visits for accessible patients"
  on public.visits for select
  to authenticated
  using (public.can_access_patient(patient_id));

drop policy if exists "staff create visits" on public.visits;
drop policy if exists "create own visits for accessible patients" on public.visits;
create policy "create own visits for accessible patients"
  on public.visits for insert
  to authenticated
  with check (clinician_id = auth.uid() and public.can_access_patient(patient_id));

drop policy if exists "staff update visits" on public.visits;
drop policy if exists "update visits for accessible patients" on public.visits;
create policy "update visits for accessible patients"
  on public.visits for update
  to authenticated
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists "staff read audit" on public.audit_events;
drop policy if exists "admin read audit" on public.audit_events;
create policy "admin read audit"
  on public.audit_events for select
  to authenticated
  using (public.is_admin());

drop policy if exists "staff write audit" on public.audit_events;
create policy "staff write audit"
  on public.audit_events for insert
  to authenticated
  with check (actor_id = auth.uid());

drop policy if exists "staff read documents" on public.patient_documents;
drop policy if exists "read documents for accessible patients" on public.patient_documents;
create policy "read documents for accessible patients"
  on public.patient_documents for select
  to authenticated
  using (public.can_access_patient(patient_id));

drop policy if exists "staff create documents" on public.patient_documents;
drop policy if exists "create documents for accessible patients" on public.patient_documents;
create policy "create documents for accessible patients"
  on public.patient_documents for insert
  to authenticated
  with check (uploaded_by = auth.uid() and public.can_access_patient(patient_id));

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

drop policy if exists "staff read patient files" on storage.objects;
drop policy if exists "read assigned patient files" on storage.objects;
create policy "read assigned patient files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_patient(split_part(name, '/', 1)::uuid)
  );

drop policy if exists "staff upload patient files" on storage.objects;
drop policy if exists "upload assigned patient files" on storage.objects;
create policy "upload assigned patient files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'patient-documents'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_access_patient(split_part(name, '/', 1)::uuid)
  );

create index if not exists patients_name_idx
  on public.patients (last_name, first_name);

create index if not exists patients_rm_id_idx
  on public.patients (rm_id);

create index if not exists patients_assigned_idx
  on public.patients (assigned_to);

create index if not exists visits_patient_idx
  on public.visits (patient_id, created_at desc);

create index if not exists visits_day_idx
  on public.visits (visit_at desc);

create index if not exists audit_created_idx
  on public.audit_events (created_at desc);

create index if not exists documents_patient_idx
  on public.patient_documents (patient_id, created_at desc);
