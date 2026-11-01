import { TIME_ZONE } from "./constants";

export function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString("en-US")}`;
}

export function formatPricePerHour(amount: number) {
  return `${formatLKR(amount)} / hour`;
}

/** "14:00:00" -> 14 */
export function hourOf(time: string) {
  return parseInt(time.slice(0, 2), 10);
}

/** 14 -> "14:00" */
export function toTime(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** 14 -> "2:00 PM", 0 or 24 -> "12:00 AM" */
export function formatHour(hour: number) {
  const h = hour % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}

export function formatTimeRange(start: string, end: string) {
  return `${formatHour(hourOf(start))} – ${formatHour(hourOf(end))}`;
}

/** "2026-11-05" -> "Thu, 5 Nov 2026" */
export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date (YYYY-MM-DD) and current hour in Sri Lanka. */
export function nowInSriLanka() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) };
}

/** Day of week (0 = Sunday) for a YYYY-MM-DD date. */
export function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Turns a Sri Lankan phone number into the international form wa.me expects. */
export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("94")) return digits;
  if (digits.startsWith("0")) return `94${digits.slice(1)}`;
  return `94${digits}`;
}
