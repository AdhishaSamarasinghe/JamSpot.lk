"use client";

import { useState, useTransition } from "react";
import { deleteStudio } from "@/app/actions/studios";

export default function DeleteStudioButton({ studioId }: { studioId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this studio and all its bookings?")) return;
          startTransition(async () => {
            const result = await deleteStudio(studioId);
            if (result?.error) setError(result.error);
          });
        }}
        className="btn-danger"
      >
        {pending ? "Deleting…" : "Delete studio"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
