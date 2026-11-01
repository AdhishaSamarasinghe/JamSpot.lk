# JamSpot.lk

Sri Lanka's first online music studio booking platform. Studio owners list their rooms, timetables, and prices; musicians book practice slots in seconds.

Built with Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (auth, Postgres, storage).

## Features

**Studio owners**
- Create, edit and delete studios: name, city, address, description, phone/WhatsApp, up to 5 photos, equipment list, price per hour (LKR)
- Weekly timetable: opening and closing time for each day, or closed
- Dashboard with new booking requests (Accept / Reject), upcoming bookings and past bookings, with the musician's name and phone

**Musicians**
- Browse studios, filter by city, search by name
- Studio page with photos, equipment, price, address, WhatsApp and call buttons, and an availability calendar
- Pick a date, select one or more consecutive 1-hour slots, see the total price and send a booking request
- My Bookings page with status (Pending, Accepted, Rejected, Cancelled); cancel pending bookings

**Booking rules (enforced in the database)**
- 1-hour slots, on the hour, inside opening hours, not in the past (Sri Lanka time)
- No double booking: pending and accepted bookings block the slot (Postgres exclusion constraint)
- Price is calculated by the database, not the browser
- Payment happens at the studio

## Setup

### 1. Create a Supabase project
Create a free project at [supabase.com](https://supabase.com).

### 2. Run the database migration
In the Supabase dashboard, open **SQL Editor**, paste the contents of [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) and click **Run**.

This creates the tables, row-level security policies, booking rules and the `studio-photos` storage bucket.

### 3. Configure auth
In **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (change to your Vercel URL when you deploy)
- **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

For quick testing you can turn off **Confirm email** in **Authentication → Sign In / Providers → Email**, so new accounts can log in straight away.

### 4. Environment variables
```bash
cp .env.example .env.local
```
Fill in the values from **Project Settings → API**:

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | App |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed script only. Keep it secret. |

### 5. Install, seed and run
```bash
npm install
npm run seed   # creates demo accounts and 3 sample studios
npm run dev
```
Open http://localhost:3000.

### Demo accounts (from the seed)
| Role | Email | Password |
| --- | --- | --- |
| Studio owner | `owner@jamspot.lk` | `password123` |
| Musician | `musician@jamspot.lk` | `password123` |

Seed studios: **Rhythm Room Colombo** (LKR 2,500), **Bassline Studios**, Colombo (LKR 3,500) and **Hill Capital Jam Space**, Kandy (LKR 1,500). There is also one pending booking request for tomorrow so the owner dashboard has something to show. Running `npm run seed` again resets the demo owner's studios.

## Deploy to Vercel
1. Push this repo to GitHub and import it in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables. (Do **not** add the service role key.)
3. Deploy, then update the Site URL and Redirect URLs in Supabase to your Vercel domain.

## Project structure
```
app/
  page.tsx                      Home: studio list, city filter, search
  studios/[id]/page.tsx         Studio details + booking widget
  bookings/page.tsx             Musician: My Bookings
  dashboard/                    Owner: dashboard, add/edit studio
  login/, signup/               Auth pages (role picked at signup)
  auth/callback/route.ts        Email confirmation link handler
  actions/                      Server actions (auth, studios, bookings)
components/                     UI components (BookingWidget, StudioForm, …)
lib/                            Supabase clients, helpers, types, constants
proxy.ts                        Refreshes the Supabase session on each request
supabase/migrations/            Database schema, RLS, booking rules, storage
scripts/seed.mjs                Demo data
```

## Database overview
- `profiles`: name, phone, role (`owner` | `musician`), created automatically on signup. Users can edit their name and phone, but not their role.
- `studios`: anyone can view; owners can only create, edit and delete their own.
- `studio_hours`: one row per day of week (0 = Sunday); only the studio owner can change them.
- `bookings`: musicians see only their own; owners see bookings for their studios. Status changes go through `cancel_booking()` (musician, pending only) and `respond_to_booking()` (owner, pending only).
- `get_booked_slots(studio, date)`: returns taken times for the availability calendar without exposing who booked them.
