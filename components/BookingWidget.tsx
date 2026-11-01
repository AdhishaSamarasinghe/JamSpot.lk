"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createBooking } from "@/app/actions/bookings";
import { DAYS_SHORT } from "@/lib/constants";
import { addDays, dayOfWeek, formatDate, formatHour, formatLKR, hourOf } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Role, StudioHours } from "@/lib/types";

const DAYS_AHEAD = 60;

type Slot = { start: number; end: number };

export default function BookingWidget({
  studioId,
  pricePerHour,
  hours,
  now,
  viewer,
}: {
  studioId: string;
  pricePerHour: number;
  hours: StudioHours[];
  now: { date: string; hour: number };
  viewer: Role | null;
}) {
  const lastDate = addDays(now.date, DAYS_AHEAD);
  const [month, setMonth] = useState(now.date.slice(0, 7)); // YYYY-MM
  const [date, setDate] = useState<string | null>(null);
  const [booked, setBooked] = useState<Slot[] | null>(null);
  const [selection, setSelection] = useState<Slot | null>(null);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const hoursByDay = useMemo(() => new Map(hours.map((h) => [h.day_of_week, h])), [hours]);

  const isOpenDay = useCallback(
    (d: string) => {
      const h = hoursByDay.get(dayOfWeek(d));
      return !!h && !h.is_closed && d >= now.date && d <= lastDate;
    },
    [hoursByDay, now.date, lastDate],
  );

  const loadBooked = useCallback(
    async (d: string) => {
      setBooked(null);
      const { data, error } = await createClient().rpc("get_booked_slots", {
        p_studio_id: studioId,
        p_date: d,
      });
      if (error) {
        setError("Could not load free times. Please try again.");
        setBooked([]);
        return;
      }
      setBooked(
        (data as { start_time: string; end_time: string }[]).map((b) => ({
          start: hourOf(b.start_time),
          end: hourOf(b.end_time),
        })),
      );
    },
    [studioId],
  );

  useEffect(() => {
    if (date) loadBooked(date);
  }, [date, loadBooked]);

  // Free 1-hour slots: inside opening hours, not booked, and not already started.
  const slots = useMemo<Slot[]>(() => {
    if (!date || !booked) return [];
    const h = hoursByDay.get(dayOfWeek(date));
    if (!h || h.is_closed || !h.open_time || !h.close_time) return [];
    const result: Slot[] = [];
    for (let start = hourOf(h.open_time); start < hourOf(h.close_time); start++) {
      const end = start + 1;
      if (date === now.date && start <= now.hour) continue;
      if (booked.some((b) => start < b.end && end > b.start)) continue;
      result.push({ start, end });
    }
    return result;
  }, [date, booked, hoursByDay, now]);

  function toggleSlot(slot: Slot) {
    setError(undefined);
    if (!selection) return setSelection(slot);
    const inSelection = slot.start >= selection.start && slot.end <= selection.end;
    if (inSelection) {
      if (selection.end - selection.start === 1) return setSelection(null);
      if (slot.start === selection.start) return setSelection({ ...selection, start: slot.end });
      if (slot.end === selection.end) return setSelection({ ...selection, end: slot.start });
      return setSelection(slot);
    }
    if (slot.end === selection.start) return setSelection({ ...selection, start: slot.start });
    if (slot.start === selection.end) return setSelection({ ...selection, end: slot.end });
    setSelection(slot);
  }

  function pickDate(d: string) {
    setDate(d);
    setSelection(null);
    setError(undefined);
    setSuccess(false);
  }

  function submit() {
    if (!date || !selection) return;
    setError(undefined);
    startTransition(async () => {
      const result = await createBooking({
        studioId,
        date,
        startHour: selection.start,
        endHour: selection.end,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setSelection(null);
      }
      loadBooked(date);
    });
  }

  const hoursSelected = selection ? selection.end - selection.start : 0;

  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Book a time</h2>

      <Calendar
        month={month}
        setMonth={setMonth}
        minMonth={now.date.slice(0, 7)}
        maxMonth={lastDate.slice(0, 7)}
        today={now.date}
        selected={date}
        isAvailable={isOpenDay}
        onPick={pickDate}
      />

      {date && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium">Free times on {formatDate(date)}</p>
          {booked === null ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              No free times on this day. Please pick another date.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const active = !!selection && slot.start >= selection.start && slot.end <= selection.end;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => toggleSlot(slot)}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                        active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-gray-300 bg-white hover:border-brand-500"
                      }`}
                    >
                      {formatHour(slot.start)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">Tap slots next to each other to book more than one hour.</p>
            </>
          )}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
          <p className="font-semibold">Booking request sent!</p>
          <p>
            The studio will accept or reject it soon. Check the status in{" "}
            <Link href="/bookings" className="font-semibold underline">
              My Bookings
            </Link>
            .
          </p>
        </div>
      )}

      {selection && date && (
        <div className="space-y-3 rounded-xl bg-brand-50 p-3">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              {formatHour(selection.start)} – {formatHour(selection.end)} ({hoursSelected} hour
              {hoursSelected > 1 ? "s" : ""})
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-700">
              {formatLKR(pricePerHour)} × {hoursSelected}
            </span>
            <span className="text-lg font-bold">{formatLKR(pricePerHour * hoursSelected)}</span>
          </div>
          {viewer === "musician" ? (
            <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full">
              {pending ? "Sending…" : "Send booking request"}
            </button>
          ) : viewer === "owner" ? (
            <p className="text-sm text-gray-600">Studio owner accounts can&apos;t book. Log in as a musician to book.</p>
          ) : (
            <Link href={`/login?next=/studios/${studioId}`} className="btn-primary w-full">
              Log in to book
            </Link>
          )}
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <p className="flex gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
        <span aria-hidden>💵</span>
        No online payment needed. You pay at the studio.
      </p>
    </div>
  );
}

function Calendar({
  month,
  setMonth,
  minMonth,
  maxMonth,
  today,
  selected,
  isAvailable,
  onPick,
}: {
  month: string;
  setMonth: (m: string) => void;
  minMonth: string;
  maxMonth: string;
  today: string;
  selected: string | null;
  isAvailable: (d: string) => boolean;
  onPick: (d: string) => void;
}) {
  const [year, mon] = month.split("-").map(Number);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const offset = dayOfWeek(first);
  const label = new Date(`${first}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function shift(delta: number) {
    const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={month <= minMonth}
          className="grid h-8 w-8 place-items-center rounded-lg hover:bg-gray-100 disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">{label}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={month >= maxMonth}
          className="grid h-8 w-8 place-items-center rounded-lg hover:bg-gray-100 disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAYS_SHORT.map((d) => (
          <span key={d} className="py-1 font-medium text-gray-500">
            {d.slice(0, 2)}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, "0")}`;
          const available = isAvailable(d);
          const isSelected = d === selected;
          return (
            <button
              key={d}
              type="button"
              disabled={!available}
              onClick={() => onPick(d)}
              className={`aspect-square rounded-lg text-sm transition ${
                isSelected
                  ? "bg-brand-600 font-semibold text-white"
                  : available
                    ? "bg-brand-50 font-medium text-brand-700 hover:bg-brand-100"
                    : "text-gray-300"
              } ${d === today && !isSelected ? "ring-1 ring-brand-500" : ""}`}
              aria-label={formatDate(d)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
