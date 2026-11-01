"use client";

import { useActionState, useState } from "react";
import { saveStudio } from "@/app/actions/studios";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";
import { CITIES, DAYS, EQUIPMENT_SUGGESTIONS, MAX_PHOTOS, PHOTO_BUCKET } from "@/lib/constants";
import { formatHour, hourOf, toTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Studio, StudioHours } from "@/lib/types";

const MAX_PHOTO_MB = 5;

// Monday first, since that's how most people read a week.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function defaultHours(): StudioHours[] {
  return DAY_ORDER.map((day) => ({
    day_of_week: day,
    open_time: "09:00",
    close_time: "21:00",
    is_closed: false,
  }));
}

function normaliseHours(hours: StudioHours[]): StudioHours[] {
  return DAY_ORDER.map((day) => {
    const h = hours.find((x) => x.day_of_week === day);
    if (!h) return { day_of_week: day, open_time: "09:00", close_time: "21:00", is_closed: true };
    return {
      day_of_week: day,
      is_closed: h.is_closed,
      open_time: h.open_time ? toTime(hourOf(h.open_time)) : "09:00",
      close_time: h.close_time ? toTime(hourOf(h.close_time)) : "21:00",
    };
  });
}

export default function StudioForm({
  ownerId,
  studio,
  hours,
}: {
  ownerId: string;
  studio?: Studio;
  hours?: StudioHours[];
}) {
  const [state, action] = useActionState(saveStudio, undefined);
  const [photos, setPhotos] = useState<string[]>(studio?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [equipment, setEquipment] = useState<string[]>(studio?.equipment ?? []);
  const [newItem, setNewItem] = useState("");
  const [timetable, setTimetable] = useState<StudioHours[]>(
    hours?.length ? normaliseHours(hours) : defaultHours(),
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(undefined);
    const room = MAX_PHOTOS - photos.length;
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) setUploadError(`You can add up to ${MAX_PHOTOS} photos.`);

    setUploading(true);
    const supabase = createClient();
    const uploaded: string[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Please choose image files only.");
        continue;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        setUploadError(`Each photo must be smaller than ${MAX_PHOTO_MB} MB.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) {
        setUploadError(`Upload failed: ${error.message}`);
        continue;
      }
      uploaded.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl);
    }
    setPhotos((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    setUploading(false);
  }

  function addEquipment(item: string) {
    const value = item.trim();
    if (value && !equipment.some((e) => e.toLowerCase() === value.toLowerCase())) {
      setEquipment([...equipment, value]);
    }
    setNewItem("");
  }

  function updateDay(day: number, patch: Partial<StudioHours>) {
    setTimetable((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  }

  return (
    <form action={action} className="space-y-6">
      {studio && <input type="hidden" name="id" value={studio.id} />}
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />
      <input type="hidden" name="equipment" value={JSON.stringify(equipment)} />
      <input type="hidden" name="hours" value={JSON.stringify(timetable)} />

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-semibold">Studio details</h2>
        <div>
          <label htmlFor="name" className="label">
            Studio name
          </label>
          <input id="name" name="name" defaultValue={studio?.name} required className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="label">
              City
            </label>
            <select id="city" name="city" defaultValue={studio?.city ?? ""} required className="input">
              <option value="" disabled>
                Choose a city
              </option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price_per_hour" className="label">
              Price per hour (LKR)
            </label>
            <input
              id="price_per_hour"
              name="price_per_hour"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="2500"
              defaultValue={studio?.price_per_hour}
              required
              className="input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="address" className="label">
            Address
          </label>
          <input id="address" name="address" defaultValue={studio?.address} required className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Phone / WhatsApp number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="077 123 4567"
            defaultValue={studio?.phone}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={studio?.description}
            placeholder="Tell musicians about your studio: room size, sound treatment, parking…"
            className="input"
          />
        </div>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Photos</h2>
          <p className="text-sm text-gray-600">Up to {MAX_PHOTOS} photos. The first one is the cover photo.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((url, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => setPhotos(photos.filter((p) => p !== url))}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-sm text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-gray-300 text-center text-sm text-gray-500 hover:bg-gray-50">
              <span>{uploading ? "Uploading…" : "+ Add photos"}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          )}
        </div>
        <FormMessage error={uploadError} />
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold">Equipment</h2>
        {equipment.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {equipment.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-700"
              >
                {item}
                <button
                  type="button"
                  onClick={() => setEquipment(equipment.filter((e) => e !== item))}
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-brand-100"
                  aria-label={`Remove ${item}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEquipment(newItem);
              }
            }}
            placeholder="e.g. Yamaha drum kit"
            className="input"
          />
          <button type="button" onClick={() => addEquipment(newItem)} className="btn-secondary shrink-0">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_SUGGESTIONS.filter((s) => !equipment.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addEquipment(s)}
              className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              + {s}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Weekly timetable</h2>
          <p className="text-sm text-gray-600">Musicians can book 1-hour slots during your opening hours.</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {timetable.map((h) => (
            <li key={h.day_of_week} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <span className="w-24 font-medium">{DAYS[h.day_of_week]}</span>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!h.is_closed}
                  onChange={(e) => updateDay(h.day_of_week, { is_closed: !e.target.checked })}
                  className="h-4 w-4 accent-brand-600"
                />
                Open
              </label>
              {h.is_closed ? (
                <span className="text-sm text-gray-500">Closed</span>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={h.open_time ?? ""}
                    onChange={(e) => updateDay(h.day_of_week, { open_time: e.target.value })}
                    className="input w-auto py-1.5 text-sm"
                    aria-label={`${DAYS[h.day_of_week]} opening time`}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={toTime(i)}>
                        {formatHour(i)}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500">to</span>
                  <select
                    value={h.close_time ?? ""}
                    onChange={(e) => updateDay(h.day_of_week, { close_time: e.target.value })}
                    className="input w-auto py-1.5 text-sm"
                    aria-label={`${DAYS[h.day_of_week]} closing time`}
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                      <option key={i} value={toTime(i)}>
                        {i === 24 ? "Midnight" : formatHour(i)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Saving…">{studio ? "Save changes" : "Create studio"}</SubmitButton>
    </form>
  );
}
