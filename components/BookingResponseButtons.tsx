"use client";

import { useState, useTransition } from "react";
import { respondToBooking } from "@/app/actions/studios";

export default function BookingResponseButtons({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function respond(status: "accepted" | "rejected") {
    if (status === "rejected" && !confirm("Reject this booking request?")) return;
    setError(undefined);
    startTransition(async () => {
      const result = await respondToBooking(bookingId, status);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button onClick={() => respond("rejected")} disabled={pending} className="btn-danger py-2">
          Reject
        </button>
        <button onClick={() => respond("accepted")} disabled={pending} className="btn-primary py-2">
          Accept
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
