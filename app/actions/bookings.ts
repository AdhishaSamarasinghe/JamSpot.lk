"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toTime } from "@/lib/format";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createBooking(input: {
  studioId: string;
  date: string;
  startHour: number;
  endHour: number;
}): Promise<{ error?: string; ok?: boolean }> {
  const { studioId, date, startHour, endHour } = input;
  if (
    !DATE_RE.test(date) ||
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < 0 ||
    endHour > 24 ||
    startHour >= endHour
  ) {
    return { error: "Please choose a valid time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to book." };

  // Price, opening hours and double-booking are all checked by the database.
  const { error } = await supabase.from("bookings").insert({
    studio_id: studioId,
    musician_id: user.id,
    date,
    start_time: toTime(startHour),
    end_time: toTime(endHour),
  });

  if (error) {
    if (error.code === "23P01") {
      return { error: "Sorry, one of these slots was just booked by someone else. Please pick another time." };
    }
    if (error.code === "42501") {
      return { error: "Only musician accounts can book studios." };
    }
    return { error: error.message };
  }

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) return { error: error.message };
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return {};
}
