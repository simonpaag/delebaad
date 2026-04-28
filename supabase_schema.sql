-- BÅDELAUG WEBAPPLIKATION SUPABASE SCHEMA OG RLS

-- 1. Tabeller
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  role text default 'user' check (role in ('user', 'admin'))
);

CREATE TABLE IF NOT EXISTS public.boats (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  location text
);

CREATE TABLE IF NOT EXISTS public.boat_members (
  user_id uuid references public.profiles(id) on delete cascade,
  boat_id uuid references public.boats(id) on delete cascade,
  primary key (user_id, boat_id)
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid default gen_random_uuid() primary key,
  boat_id uuid references public.boats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  start_date timestamptz not null,
  end_date timestamptz not null,
  check (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid default gen_random_uuid() primary key,
  platform_name text default 'Bådelaug',
  maintenance_mode boolean default false
);

-- Indsæt default indstillinger
INSERT INTO public.settings (platform_name, maintenance_mode) 
SELECT 'Bådelaug Netværk', false 
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- 2. RLS Aktivering
alter table public.profiles enable row level security;
alter table public.boats enable row level security;
alter table public.boat_members enable row level security;
alter table public.bookings enable row level security;
alter table public.settings enable row level security;

-- 3. Hjælpefunktion: tjekker om nuværende auth bruger er admin
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role = 'admin';
end;
$$ language plpgsql security definer;

-- 4. RLS Policies for ADMINS (Fuld adgang overalt)
-- Profiles
create policy "Admins can do everything on profiles" on public.profiles to authenticated using (public.is_admin());
-- Boats
create policy "Admins can do everything on boats" on public.boats to authenticated using (public.is_admin());
-- Boat Members
create policy "Admins can do everything on boat_members" on public.boat_members to authenticated using (public.is_admin());
-- Bookings
create policy "Admins can do everything on bookings" on public.bookings to authenticated using (public.is_admin());
-- Settings
create policy "Admins can do everything on settings" on public.settings to authenticated using (public.is_admin());

-- 5. RLS Policies for USERS

-- PROFILES
-- Brugere kan kun læse deres egen profil
create policy "Users kan læse egen profil" on public.profiles for select to authenticated using (auth.uid() = id);

-- BOATS
-- Brugere kan kun læse boths som de er medlem af
create policy "Users kan læse både de er tilknyttet" on public.boats for select to authenticated 
using (
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boats.id and bm.user_id = auth.uid()
  )
);

-- BOAT_MEMBERS
-- Brugere kan se deres eget medlemskab
-- Funktion til at hente båd-id'er for en bruger sikkert uden at trigge recursion
create or replace function public.get_user_boat_ids()
returns setof uuid as $$
begin
  return query select bl.boat_id from public.boat_members bl where bl.user_id = auth.uid();
end;
$$ language plpgsql security definer;

create policy "Users kan se deres tilknytninger og andres på samme båd" on public.boat_members for select to authenticated
using (
  boat_id in (select public.get_user_boat_ids())
);

-- BOOKINGS
-- Brugere kan læse bookinger på både, de har adgang til
create policy "Users kan læse bookinger på deres både" on public.bookings for select to authenticated
using (
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = bookings.boat_id and bm.user_id = auth.uid()
  )
);

-- Brugere kan oprette bookinger på både, de har adgang til
create policy "Users kan oprette bookinger på deres både" on public.bookings for insert to authenticated
with check (
  auth.uid() = user_id and 
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = bookings.boat_id and bm.user_id = auth.uid()
  )
);

-- Brugere kan slette eller ændre deres EGNE bookinger
create policy "Users kan ændre og slette egne bookinger" on public.bookings for update to authenticated
using (auth.uid() = user_id);

create policy "Users kan slette egne bookinger" on public.bookings for delete to authenticated
using (auth.uid() = user_id);

-- SETTINGS
-- Alle brugere kan læse globale settings
create policy "Alle kan læse settings" on public.settings for select to authenticated using (true);

-- 6. Trigger for automatisk oprettelse af public.profiles række med rolle 'user'
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Slet evt tidl trigger for at opdatere
drop trigger if exists on_auth_user_created on auth.users;

-- Opret ny trigger, der fyrer ved insert på auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- NYE FEATURES (EPIC A & D)
-- ==========================================

-- 7. Logbog (Epic A)
CREATE TABLE IF NOT EXISTS public.boat_logs (
  id uuid default gen_random_uuid() primary key,
  boat_id uuid references public.boats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.boat_logs enable row level security;
create policy "Admins can do everything on boat_logs" on public.boat_logs to authenticated using (public.is_admin());

create policy "Users kan læse logs for deres både" on public.boat_logs for select to authenticated
using (
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boat_logs.boat_id and bm.user_id = auth.uid()
  )
);

create policy "Users kan oprette logs for deres både" on public.boat_logs for insert to authenticated
with check (
  auth.uid() = user_id and 
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boat_logs.boat_id and bm.user_id = auth.uid()
  )
);

create policy "Users kan slette egne logs" on public.boat_logs for delete to authenticated
using (auth.uid() = user_id);

-- 8. Booking Validering (Epic D)
create or replace function public.check_booking_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings b
    where b.boat_id = new.boat_id
      and b.id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and (
        (new.start_date < b.end_date) and (new.end_date > b.start_date)
      )
  ) then
    raise exception 'Booking overlapper med en eksisterende booking.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_booking_overlap on public.bookings;
create trigger prevent_booking_overlap
  before insert or update on public.bookings
  for each row execute procedure public.check_booking_overlap();

-- ==========================================
-- NYE FEATURES (BÅDSMAND ROLLER)
-- ==========================================

-- 9. Tilføj member_role kolonne
ALTER TABLE IF EXISTS public.boat_members 
ADD COLUMN IF NOT EXISTS member_role text default 'sejler' check (member_role in ('sejler', 'baadsmand'));

-- 10. Hjælpefunktion: Er brugeren Bådsmand?
create or replace function public.is_baadsmand(check_boat_id uuid)
returns boolean as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1 from public.boat_members 
    where boat_id = check_boat_id 
      and user_id = auth.uid() 
      and member_role = 'baadsmand'
  ) into is_admin;
  return is_admin;
end;
$$ language plpgsql security definer;

-- 11. Nye RLS Politikker for Bådsmænd
-- Tillad UPDATE på selve båden
drop policy if exists "Bådsmænd kan opdatere egne både" on public.boats;
create policy "Bådsmænd kan opdatere egne både" on public.boats for update to authenticated
using (public.is_baadsmand(id))
with check (public.is_baadsmand(id));

-- Tillad DELETE af andres bookinger
drop policy if exists "Bådsmænd kan slette andres bookinger" on public.bookings;
create policy "Bådsmænd kan slette andres bookinger" on public.bookings for delete to authenticated
using (public.is_baadsmand(boat_id) OR auth.uid() = user_id);

-- Tillad DELETE af logs
drop policy if exists "Bådsmænd kan slette logs" on public.boat_logs;
create policy "Bådsmænd kan slette logs" on public.boat_logs for delete to authenticated
using (public.is_baadsmand(boat_id) OR auth.uid() = user_id);

-- ==========================================
-- EPIC B: Udgifter & Økonomi
-- ==========================================

CREATE TABLE IF NOT EXISTS public.boat_expenses (
  id uuid default gen_random_uuid() primary key,
  boat_id uuid references public.boats(id) on delete cascade,
  paid_by_user_id uuid references public.profiles(id) on delete cascade,
  amount numeric not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.boat_expenses enable row level security;

create policy "Admins can do everything on boat_expenses" on public.boat_expenses to authenticated using (public.is_admin());

create policy "Users kan læse udgifter for deres både" on public.boat_expenses for select to authenticated
using (
  boat_id in (select public.get_user_boat_ids())
);

create policy "Users kan oprette udgifter for deres både" on public.boat_expenses for insert to authenticated
with check (
  auth.uid() = paid_by_user_id and 
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boat_expenses.boat_id and bm.user_id = auth.uid()
  )
);

create policy "Users kan slette egne udgifter" on public.boat_expenses for delete to authenticated
using (auth.uid() = paid_by_user_id OR public.is_baadsmand(boat_id));


-- ==========================================
-- EPIC C: Vedligehold og Opgaver
-- ==========================================

CREATE TABLE IF NOT EXISTS public.boat_tasks (
  id uuid default gen_random_uuid() primary key,
  boat_id uuid references public.boats(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.boat_tasks enable row level security;

create policy "Admins can do everything on boat_tasks" on public.boat_tasks to authenticated using (public.is_admin());

create policy "Users kan læse opgaver for deres både" on public.boat_tasks for select to authenticated
using (
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boat_tasks.boat_id and bm.user_id = auth.uid()
  )
);

create policy "Users kan oprette opgaver for deres både" on public.boat_tasks for insert to authenticated
with check (
  auth.uid() = created_by and 
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boat_tasks.boat_id and bm.user_id = auth.uid()
  )
);

create policy "Users kan opdatere opgaver på deres både" on public.boat_tasks for update to authenticated
using (
  exists (
    select 1 from public.boat_members bm
    where bm.boat_id = boat_tasks.boat_id and bm.user_id = auth.uid()
  )
);

create policy "Bådsmænd kan slette opgaver" on public.boat_tasks for delete to authenticated
using (auth.uid() = created_by OR public.is_baadsmand(boat_id));

-- ==========================================
-- ADMIN KANBAN BOARD (TICKETS)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text not null default 'Ideas&bugs' check (status in ('Ideas&bugs', 'Tickets', 'In production', 'Testing', 'Done')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admin_tickets enable row level security;

create policy "Admins can do everything on admin_tickets" on public.admin_tickets to authenticated using (public.is_admin()) with check (public.is_admin());

-- ==========================================
-- KANBAN IMAGES STORAGE BUCKET
-- ==========================================
alter table public.admin_tickets add column if not exists image_url text;

insert into storage.buckets (id, name, public) 
values ('kanban_images', 'kanban_images', true)
on conflict (id) do nothing;

create policy "Admins can upload kanban images" on storage.objects for insert to authenticated with check (bucket_id = 'kanban_images' and public.is_admin());
create policy "Admins can update kanban images" on storage.objects for update to authenticated using (bucket_id = 'kanban_images' and public.is_admin());
create policy "Admins can delete kanban images" on storage.objects for delete to authenticated using (bucket_id = 'kanban_images' and public.is_admin());
create policy "Public can view kanban images" on storage.objects for select using (bucket_id = 'kanban_images');

-- ==========================================
-- BOAT IMAGES STORAGE BUCKET
-- ==========================================
alter table public.boats add column if not exists image_url text;

insert into storage.buckets (id, name, public) 
values ('boat_images', 'boat_images', true)
on conflict (id) do nothing;

create policy "Admins can upload boat images" on storage.objects for insert to authenticated with check (bucket_id = 'boat_images' and public.is_admin());
create policy "Admins can update boat images" on storage.objects for update to authenticated using (bucket_id = 'boat_images' and public.is_admin());
create policy "Admins can delete boat images" on storage.objects for delete to authenticated using (bucket_id = 'boat_images' and public.is_admin());
create policy "Public can view boat images" on storage.objects for select using (bucket_id = 'boat_images');

-- ==========================================
-- MIGRATION FOR 3-TIMERS TIMESLOTS
-- ==========================================
-- Kør disse linjer i Supabase SQL editor for at opdatere tabellen:
/*
ALTER TABLE public.bookings ALTER COLUMN start_date TYPE timestamptz USING start_date::timestamptz;
ALTER TABLE public.bookings ALTER COLUMN end_date TYPE timestamptz USING end_date::timestamptz;

create or replace function public.check_booking_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings b
    where b.boat_id = new.boat_id
      and b.id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and (
        (new.start_date < b.end_date) and (new.end_date > b.start_date)
      )
  ) then
    raise exception 'Booking overlapper med en eksisterende booking.';
  end if;
  return new;
end;
$$ language plpgsql security definer;
*/
