"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import StudioPhoto from "./StudioPhoto";

export default function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return <StudioPhoto alt={name} className="aspect-[16/9] w-full rounded-2xl sm:aspect-[21/9]" />;
  }

  return (
    <div className="space-y-2">
      <img
        src={photos[active]}
        alt={`${name} photo ${active + 1}`}
        className="aspect-[4/3] w-full rounded-2xl bg-gray-100 object-cover sm:aspect-[21/9]"
      />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === active ? "ring-brand-500" : "ring-transparent opacity-70"
              }`}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
