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

