"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CITIES, MAX_PHOTOS, PHOTO_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { StudioHours } from "@/lib/types";

export type StudioFormState = { error?: string } | undefined;

const TIME_RE = /^([01]\d|2[0-4]):00$/;

function parseJSON<T>(value: FormDataEntryValue | null, fallback: T): T {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Storage path ("<user id>/<file>") for a public photo URL in our bucket, or null. */
function photoPath(url: string) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/`;
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

async function getOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  return { supabase, user };
}

export async function saveStudio(_prev: StudioFormState, formData: FormData): Promise<StudioFormState> {
  const { supabase, user } = await getOwner();

  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const price = Number(formData.get("price_per_hour"));
  const equipment = parseJSON<string[]>(formData.get("equipment"), [])
    .map((e) => String(e).trim())
    .filter(Boolean)
    .slice(0, 30);
  const photos = parseJSON<string[]>(formData.get("photos"), []);
  const hours = parseJSON<StudioHours[]>(formData.get("hours"), []);

  if (name.length < 2) return { error: "Please enter the studio name." };
  if (!(CITIES as readonly string[]).includes(city)) return { error: "Please choose a city." };
  if (!address) return { error: "Please enter the address." };
  if (!phone) return { error: "Please enter a phone or WhatsApp number." };
  if (!Number.isInteger(price) || price <= 0) return { error: "Please enter a valid price per hour." };
  if (photos.length > MAX_PHOTOS) return { error: `You can add up to ${MAX_PHOTOS} photos.` };
  if (photos.some((url) => !photoPath(url)?.startsWith(`${user.id}/`))) {
    return { error: "One of the photos is invalid. Please upload it again." };
  }
  if (hours.length !== 7 || new Set(hours.map((h) => h.day_of_week)).size !== 7) {
    return { error: "Please set the timetable for every day of the week." };
  }
  for (const h of hours) {
    if (h.is_closed) continue;
    if (!TIME_RE.test(h.open_time ?? "") || !TIME_RE.test(h.close_time ?? "") || h.open_time! >= h.close_time!) {
      return { error: "Each open day needs a closing time after its opening time." };
    }
  }

  const fields = { name, city, address, description, phone, price_per_hour: price, equipment, photos };
  let studioId = id;
  let removedPhotos: string[] = [];

  if (id) {
    const { data: existing } = await supabase
      .from("studios")
      .select("photos")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!existing) return { error: "Studio not found." };
    removedPhotos = (existing.photos as string[]).filter((p) => !photos.includes(p));

    const { error } = await supabase.from("studios").update(fields).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("studios")
      .insert({ ...fields, owner_id: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    studioId = data.id;
  }

  const { error: hoursError } = await supabase.from("studio_hours").upsert(
    hours.map((h) => ({
      studio_id: studioId,
      day_of_week: h.day_of_week,
      is_closed: h.is_closed,
      open_time: h.is_closed ? null : h.open_time,
      close_time: h.is_closed ? null : h.close_time,
    })),
    { onConflict: "studio_id,day_of_week" },
  );
  if (hoursError) return { error: hoursError.message };

  const paths = removedPhotos.map(photoPath).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function deleteStudio(studioId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getOwner();

  const { data: studio } = await supabase
    .from("studios")
    .select("photos")
    .eq("id", studioId)
    .eq("owner_id", user.id)
    .single();
  if (!studio) return { error: "Studio not found." };

  const { error } = await supabase.from("studios").delete().eq("id", studioId);
  if (error) return { error: error.message };

  const paths = (studio.photos as string[]).map(photoPath).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function respondToBooking(
  bookingId: string,
  status: "accepted" | "rejected",
): Promise<{ error?: string }> {
  const { supabase } = await getOwner();
  const { error } = await supabase.rpc("respond_to_booking", {
    p_booking_id: bookingId,
    p_status: status,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}
