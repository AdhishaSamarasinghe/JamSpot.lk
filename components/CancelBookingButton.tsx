"use client";

import { useState, useTransition } from "react";
import { cancelBooking } from "@/app/actions/bookings";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Cancel this booking request?")) return;
          startTransition(async () => {
            const result = await cancelBooking(bookingId);
            if (result.error) setError(result.error);
          });
        }}
        className="btn-danger py-1.5"
      >
        {pending ? "Cancelling…" : "Cancel booking"}
      </button>
    </div>
  );
}
