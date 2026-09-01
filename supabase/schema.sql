-- Trip Feedback Hub database
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  vehicle_number text,
  vehicle_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  passenger_name text not null,
  trip_date timestamptz not null default now(),
  vehicle_number text,
  trip_type text default 'Economy',
  status text not null default 'completed' check (status in ('completed','pending','cancelled')),
  feedback_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  passenger_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  submission_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists trips_driver_id_idx on public.trips(driver_id);
create index if not exists trips_trip_date_idx on public.trips(trip_date desc);
create index if not exists feedback_driver_id_idx on public.feedback(driver_id);
create index if not exists feedback_trip_id_idx on public.feedback(trip_id);
create index if not exists feedback_rating_idx on public.feedback(rating);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own" on public.trips for select to authenticated using (driver_id = auth.uid());

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips for insert to authenticated with check (driver_id = auth.uid());

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own" on public.trips for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own" on public.trips for delete to authenticated using (driver_id = auth.uid());

-- Public passenger feedback:
-- The feedback_token acts as an unguessable capability URL.
drop policy if exists "trips_public_by_feedback_token" on public.trips;
create policy "trips_public_by_feedback_token" on public.trips
for select to anon
using (feedback_token is not null);

-- The insert policy requires the submitted token to match the trip token.
drop policy if exists "feedback_public_insert_with_token" on public.feedback;
create policy "feedback_public_insert_with_token" on public.feedback
for insert to anon
with check (
  submission_token is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_id
      and t.driver_id = feedback.driver_id
      and t.feedback_token = feedback.submission_token
  )
);

drop policy if exists "feedback_driver_select_own" on public.feedback;
create policy "feedback_driver_select_own" on public.feedback
for select to authenticated using (driver_id = auth.uid());

drop policy if exists "feedback_driver_update_own" on public.feedback;
create policy "feedback_driver_update_own" on public.feedback
for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- Create profile automatically whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Driver'),
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
