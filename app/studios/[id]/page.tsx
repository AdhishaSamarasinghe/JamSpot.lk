import Link from "next/link";
import { notFound } from "next/navigation";
import BookingWidget from "@/components/BookingWidget";
import PhotoGallery from "@/components/PhotoGallery";
import { getProfile } from "@/lib/auth";
import { DAYS } from "@/lib/constants";
import { formatHour, formatPricePerHour, hourOf, nowInSriLanka, whatsappNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Studio, StudioHours } from "@/lib/types";

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: studio }, { data: hours }, profile] = await Promise.all([
    supabase.from("studios").select("*").eq("id", id).maybeSingle<Studio>(),
    supabase.from("studio_hours").select("*").eq("studio_id", id).returns<StudioHours[]>(),
    getProfile(),
  ]);
  if (!studio) notFound();

  const timetable = [1, 2, 3, 4, 5, 6, 0].map((day) => hours?.find((h) => h.day_of_week === day));

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-gray-600">
        ← All studios
      </Link>

      <PhotoGallery photos={studio.photos} name={studio.name} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{studio.name}</h1>
            <p className="mt-1 text-gray-600">📍 {studio.address ? `${studio.address}, ` : ""}{studio.city}</p>
            <p className="mt-2 text-lg font-bold text-brand-700">{formatPricePerHour(studio.price_per_hour)}</p>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://wa.me/${whatsappNumber(studio.phone)}?text=${encodeURIComponent(
                `Hi, I found ${studio.name} on JamSpot.lk`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn flex-1 bg-green-600 text-white hover:bg-green-700 sm:flex-none"
            >
              WhatsApp
            </a>
            <a href={`tel:${studio.phone}`} className="btn-secondary flex-1 sm:flex-none">
              Call {studio.phone}
            </a>
          </div>

          {studio.description && (
            <section>
              <h2 className="mb-2 font-semibold">About</h2>
              <p className="whitespace-pre-line text-gray-700">{studio.description}</p>
            </section>
          )}

          {studio.equipment.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Equipment</h2>
              <ul className="flex flex-wrap gap-2">
                {studio.equipment.map((item) => (
                  <li key={item} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 font-semibold">Opening hours</h2>
            <ul className="card divide-y divide-gray-100 text-sm">
              {timetable.map((h, i) => (
                <li key={i} className="flex justify-between px-4 py-2">
                  <span>{DAYS[[1, 2, 3, 4, 5, 6, 0][i]]}</span>
                  <span className={!h || h.is_closed ? "text-gray-400" : ""}>
                    {!h || h.is_closed
                      ? "Closed"
                      : `${formatHour(hourOf(h.open_time!))} – ${formatHour(hourOf(h.close_time!))}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BookingWidget
            studioId={studio.id}
            pricePerHour={studio.price_per_hour}
            hours={hours ?? []}
            now={nowInSriLanka()}
            viewer={profile?.role ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
