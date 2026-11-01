import Link from "next/link";
import BookingResponseButtons from "@/components/BookingResponseButtons";
import StatusBadge from "@/components/StatusBadge";
import StudioPhoto from "@/components/StudioPhoto";
import { requireRole } from "@/lib/auth";
import {
  formatDate,
  formatLKR,
  formatPricePerHour,
  formatTimeRange,
  hourOf,
  nowInSriLanka,
  whatsappNumber,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Booking, Studio } from "@/lib/types";

type OwnerBooking = Booking & {
  studio: { name: string };
  musician: { name: string; phone: string } | null;
};

export default async function DashboardPage() {
  const profile = await requireRole("owner", "/dashboard");
  const supabase = await createClient();

  const { data: studios } = await supabase
    .from("studios")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: true })
    .returns<Studio[]>();

  const studioIds = (studios ?? []).map((s) => s.id);
  const { data: bookings } = studioIds.length
    ? await supabase
        .from("bookings")
        .select("*, studio:studios(name), musician:profiles(name, phone)")
        .in("studio_id", studioIds)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .returns<OwnerBooking[]>()
    : { data: [] as OwnerBooking[] };

  const now = nowInSriLanka();
  const isUpcoming = (b: Booking) =>
    b.date > now.date || (b.date === now.date && hourOf(b.start_time) > now.hour);

  const all = bookings ?? [];
  const pending = all.filter((b) => b.status === "pending" && isUpcoming(b));
  const upcoming = all.filter((b) => b.status === "accepted" && isUpcoming(b));
  const past = all
    .filter((b) => !pending.includes(b) && !upcoming.includes(b))
    .reverse()
    .slice(0, 30);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hi {profile.name.split(" ")[0] || "there"} 👋</h1>
        <p className="text-sm text-gray-600">Manage your studios and booking requests.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My studios</h2>
          <Link href="/dashboard/studios/new" className="btn-primary py-2">
            + Add studio
          </Link>
        </div>
        {studios?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {studios.map((s) => (
              <li key={s.id} className="card flex gap-3 p-3">
                <StudioPhoto
                  src={s.photos[0]}
                  alt={s.name}
                  className="h-20 w-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-sm text-gray-600">{s.city}</p>
                  <p className="text-sm font-medium text-brand-700">{formatPricePerHour(s.price_per_hour)}</p>
                  <div className="mt-1 flex gap-3 text-sm font-medium">
                    <Link href={`/dashboard/studios/${s.id}/edit`} className="text-brand-600">
                      Edit
                    </Link>
                    <Link href={`/studios/${s.id}`} className="text-gray-600">
                      View page
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium">You haven&apos;t listed a studio yet.</p>
            <p className="mt-1 text-sm text-gray-600">Add your studio so musicians can find and book it.</p>
            <Link href="/dashboard/studios/new" className="btn-primary mt-4">
              Add your first studio
            </Link>
          </div>
        )}
      </section>

      {studioIds.length > 0 && (
        <>
          <BookingSection
            title="New requests"
            empty="No new booking requests."
            bookings={pending}
            showActions
          />
          <BookingSection title="Upcoming accepted bookings" empty="No upcoming bookings." bookings={upcoming} />
          {past.length > 0 && <BookingSection title="Past and closed bookings" bookings={past} muted />}
        </>
      )}
    </div>
  );
}

function BookingSection({
  title,
  empty,
  bookings,
  showActions,
  muted,
}: {
  title: string;
  empty?: string;
  bookings: OwnerBooking[];
  showActions?: boolean;
  muted?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {title} {bookings.length > 0 && <span className="text-gray-400">({bookings.length})</span>}
      </h2>
      {bookings.length === 0 ? (
        <p className="card p-4 text-sm text-gray-600">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className={`card p-4 ${muted ? "opacity-75" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{formatDate(b.date)}</p>
                  <p className="text-sm text-gray-700">
                    {formatTimeRange(b.start_time, b.end_time)} · {formatLKR(b.total_price)}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">{b.studio.name}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <div className="text-sm">
                  <p className="font-medium">{b.musician?.name || "Musician"}</p>
                  {b.musician?.phone && (
                    <p className="flex gap-3">
                      <a href={`tel:${b.musician.phone}`} className="text-brand-600">
                        {b.musician.phone}
                      </a>
                      <a
                        href={`https://wa.me/${whatsappNumber(b.musician.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600"
                      >
                        WhatsApp
                      </a>
                    </p>
                  )}
                </div>
                {showActions && <BookingResponseButtons bookingId={b.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
