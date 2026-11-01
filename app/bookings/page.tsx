import Link from "next/link";
import CancelBookingButton from "@/components/CancelBookingButton";
import StatusBadge from "@/components/StatusBadge";
import StudioPhoto from "@/components/StudioPhoto";
import { requireRole } from "@/lib/auth";
import { formatDate, formatLKR, formatTimeRange, hourOf, nowInSriLanka } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Booking, Studio } from "@/lib/types";

type MusicianBooking = Booking & {
  studio: Pick<Studio, "id" | "name" | "city" | "address" | "phone" | "photos"> | null;
};

export default async function MyBookingsPage() {
  const profile = await requireRole("musician", "/bookings");
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, studio:studios(id, name, city, address, phone, photos)")
    .eq("musician_id", profile.id)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .returns<MusicianBooking[]>();

  const now = nowInSriLanka();
  const isUpcoming = (b: Booking) =>
    b.date > now.date || (b.date === now.date && hourOf(b.start_time) > now.hour);

  const all = bookings ?? [];
  const upcoming = all.filter(isUpcoming).reverse();
  const past = all.filter((b) => !isUpcoming(b));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-sm text-gray-600">Remember: you pay at the studio. No online payment needed.</p>
      </div>

      {all.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-medium">You have no bookings yet.</p>
          <Link href="/" className="btn-primary mt-4">
            Find a studio
          </Link>
        </div>
      ) : (
        <>
          <BookingList title="Upcoming" bookings={upcoming} canCancel empty="No upcoming bookings." />
          {past.length > 0 && <BookingList title="Past" bookings={past} />}
        </>
      )}
    </div>
  );
}

function BookingList({
  title,
  bookings,
  canCancel,
  empty,
}: {
  title: string;
  bookings: MusicianBooking[];
  canCancel?: boolean;
  empty?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {bookings.length === 0 ? (
        <p className="card p-4 text-sm text-gray-600">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="card p-3">
              <div className="flex gap-3">
                <StudioPhoto
                  src={b.studio?.photos[0]}
                  alt={b.studio?.name ?? "Studio"}
                  className="h-16 w-16 shrink-0 rounded-xl text-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    {b.studio ? (
                      <Link href={`/studios/${b.studio.id}`} className="truncate font-semibold">
                        {b.studio.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-500">Studio removed</span>
                    )}
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-gray-700">{formatDate(b.date)}</p>
                  <p className="text-sm text-gray-700">
                    {formatTimeRange(b.start_time, b.end_time)} · {formatLKR(b.total_price)}
                  </p>
                  {b.studio && <p className="truncate text-xs text-gray-500">{b.studio.city}</p>}
                </div>
              </div>
              {canCancel && b.status === "pending" && (
                <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                  <CancelBookingButton bookingId={b.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
