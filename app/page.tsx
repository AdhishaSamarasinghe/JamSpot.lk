import Link from "next/link";
import StudioPhoto from "@/components/StudioPhoto";
import { CITIES } from "@/lib/constants";
import { formatLKR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Studio } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const { city = "", q = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("studios")
    .select("id, name, city, price_per_hour, photos")
    .order("created_at", { ascending: false });
  if (city) query = query.eq("city", city);
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`);
  const { data: studios, error } = await query.returns<
    Pick<Studio, "id" | "name" | "city" | "price_per_hour" | "photos">[]
  >();

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-5 py-7 text-white sm:px-8 sm:py-10">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">
          Book a music studio
          <br />
          anywhere in Sri Lanka
        </h1>
        <p className="mt-2 max-w-md text-sm text-brand-100 sm:text-base">
          Find a practice room, check free times, and send a booking request in seconds.
        </p>
      </section>

      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search studios by name"
          className="input sm:flex-1"
          aria-label="Search by name"
        />
        <div className="flex gap-2">
          <select name="city" defaultValue={city} className="input flex-1 sm:w-48" aria-label="City">
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="btn-primary">Search</button>
        </div>
      </form>

      {(city || q) && (
        <p className="text-sm text-gray-600">
          {studios?.length ?? 0} studio{studios?.length === 1 ? "" : "s"} found{" "}
          <Link href="/" className="font-medium text-brand-600">
            Clear filters
          </Link>
        </p>
      )}

      {error ? (
        <p className="card p-6 text-center text-sm text-red-600">Could not load studios. Please try again.</p>
      ) : !studios?.length ? (
        <div className="card p-8 text-center">
          <p className="font-medium">No studios found.</p>
          <p className="mt-1 text-sm text-gray-600">Try a different city or search term.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((s) => (
            <li key={s.id}>
              <Link
                href={`/studios/${s.id}`}
                className="card block overflow-hidden transition hover:shadow-md active:scale-[0.99]"
              >
                <StudioPhoto src={s.photos[0]} alt={s.name} className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <h2 className="truncate text-base font-semibold">{s.name}</h2>
                  <p className="text-sm text-gray-600">📍 {s.city}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-bold text-brand-700">{formatLKR(s.price_per_hour)}</span>
                    <span className="text-gray-500"> / hour</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
