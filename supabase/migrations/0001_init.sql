-- JamSpot.lk initial schema
-- Run this in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  role text not null check (role in ('owner', 'musician')),
  created_at timestamptz not null default now()
);

create table public.studios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  city text not null,
  address text not null default '',
  description text not null default '',
  phone text not null default '',
  price_per_hour integer not null check (price_per_hour > 0),
  equipment text[] not null default '{}',
  photos text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 5),
  created_at timestamptz not null default now()
);

create index studios_owner_id_idx on public.studios (owner_id);
create index studios_city_idx on public.studios (city);

create table public.studio_hours (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique (studio_id, day_of_week),
  check (is_closed or (open_time is not null and close_time is not null and open_time < close_time))
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios (id) on delete cascade,
  musician_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  total_price integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  check (start_time < end_time),
  -- A slot can't be double-booked: pending and accepted bookings block it.
  constraint bookings_no_overlap exclude using gist (
    studio_id with =,
    tsrange(date + start_time, date + end_time) with &&
  ) where (status in ('pending', 'accepted'))
);

create index bookings_musician_id_idx on public.bookings (musician_id);
create index bookings_studio_date_idx on public.bookings (studio_id, date);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.current_role_is(r text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = r);
$$;

create or replace function public.owns_studio(s_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from studios where id = s_id and owner_id = auth.uid());
$$;

-- Create a profile row when a user signs up. Name, phone and role come from
-- the signUp() options.data metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner' else 'musician' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Validate new bookings and compute the price on the server, so the client
-- can't book outside opening hours, in the past, or set its own price.
create or replace function public.validate_booking()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  h studio_hours;
  price integer;
  local_now timestamp := now() at time zone 'Asia/Colombo';
begin
  if extract(minute from new.start_time) <> 0 or extract(second from new.start_time) <> 0
     or extract(minute from new.end_time) <> 0 or extract(second from new.end_time) <> 0 then
    raise exception 'Bookings must start and end on the hour';
  end if;

  if new.date + new.start_time <= local_now then
    raise exception 'You cannot book a time in the past';
  end if;

  select * into h from studio_hours
  where studio_id = new.studio_id and day_of_week = extract(dow from new.date);

  if not found or h.is_closed then
    raise exception 'The studio is closed on this day';
  end if;

  if new.start_time < h.open_time or new.end_time > h.close_time then
    raise exception 'This time is outside the studio opening hours';
  end if;

  select price_per_hour into price from studios where id = new.studio_id;
  new.total_price := price * (extract(epoch from (new.end_time - new.start_time)) / 3600)::int;
  new.status := 'pending';
  new.created_at := now();
  return new;
end;
$$;

create trigger bookings_validate
  before insert on public.bookings
  for each row execute function public.validate_booking();

-- Booked time ranges for a studio on a date. Lets anyone see which slots are
-- taken without exposing who booked them.
create or replace function public.get_booked_slots(p_studio_id uuid, p_date date)
returns table (start_time time, end_time time)
language sql stable security definer set search_path = public
as $$
  select b.start_time, b.end_time from bookings b
  where b.studio_id = p_studio_id and b.date = p_date
    and b.status in ('pending', 'accepted');
$$;

-- Musician cancels their own pending booking.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update bookings set status = 'cancelled'
  where id = p_booking_id and musician_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Booking not found or can no longer be cancelled';
  end if;
end;
$$;

-- Studio owner accepts or rejects a pending booking for one of their studios.
create or replace function public.respond_to_booking(p_booking_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('accepted', 'rejected') then
    raise exception 'Invalid status';
  end if;
  update bookings b set status = p_status
  from studios s
  where b.id = p_booking_id and b.studio_id = s.id
    and s.owner_id = auth.uid() and b.status = 'pending';
  if not found then
    raise exception 'Booking not found or already handled';
  end if;
end;
$$;

-- Owners can see the name and phone of musicians who booked their studios.
create or replace function public.booked_my_studio(p_musician_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from bookings b join studios s on s.id = b.studio_id
    where b.musician_id = p_musician_id and s.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.studios enable row level security;
alter table public.studio_hours enable row level security;
alter table public.bookings enable row level security;

-- profiles
create policy "Users can view their own profile" on public.profiles
  for select using (id = auth.uid());
create policy "Owners can view musicians who booked them" on public.profiles
  for select using (public.booked_my_studio(id));
create policy "Users can update their own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Users may only change their name and phone, never their role.
revoke update on public.profiles from anon, authenticated;
grant update (name, phone) on public.profiles to authenticated;

-- studios
create policy "Anyone can view studios" on public.studios
  for select using (true);
create policy "Owners can create studios" on public.studios
  for insert with check (owner_id = auth.uid() and public.current_role_is('owner'));
create policy "Owners can update their studios" on public.studios
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners can delete their studios" on public.studios
  for delete using (owner_id = auth.uid());

-- studio_hours
create policy "Anyone can view studio hours" on public.studio_hours
  for select using (true);
create policy "Owners can add hours" on public.studio_hours
  for insert with check (public.owns_studio(studio_id));
create policy "Owners can update hours" on public.studio_hours
  for update using (public.owns_studio(studio_id)) with check (public.owns_studio(studio_id));
create policy "Owners can delete hours" on public.studio_hours
  for delete using (public.owns_studio(studio_id));

-- bookings (status changes go through cancel_booking / respond_to_booking)
create policy "Musicians can view their bookings" on public.bookings
  for select using (musician_id = auth.uid());
create policy "Owners can view bookings for their studios" on public.bookings
  for select using (public.owns_studio(studio_id));
create policy "Musicians can create bookings" on public.bookings
  for insert with check (musician_id = auth.uid() and public.current_role_is('musician'));

revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.respond_to_booking(uuid, text) from public, anon;
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.respond_to_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Photo storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('studio-photos', 'studio-photos', true)
on conflict (id) do nothing;

-- Files are stored as <user id>/<file name>, so users can only touch their own folder.
create policy "Anyone can view studio photos" on storage.objects
  for select using (bucket_id = 'studio-photos');
create policy "Owners can upload studio photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'studio-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners can delete their studio photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'studio-photos' and (storage.foldername(name))[1] = auth.uid()::text);
