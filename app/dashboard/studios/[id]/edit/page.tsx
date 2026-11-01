import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteStudioButton from "@/components/DeleteStudioButton";
import StudioForm from "@/components/StudioForm";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Studio, StudioHours } from "@/lib/types";

export default async function EditStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole("owner", `/dashboard/studios/${id}/edit`);
  const supabase = await createClient();

  const [{ data: studio }, { data: hours }] = await Promise.all([
    supabase.from("studios").select("*").eq("id", id).eq("owner_id", profile.id).maybeSingle<Studio>(),
    supabase.from("studio_hours").select("*").eq("studio_id", id).returns<StudioHours[]>(),
  ]);
  if (!studio) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard" className="text-sm text-gray-600">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold">Edit studio</h1>
      <StudioForm ownerId={profile.id} studio={studio} hours={hours ?? []} />
      <div className="card space-y-2 border-red-200 p-4">
        <h2 className="font-semibold text-red-700">Delete this studio</h2>
        <p className="text-sm text-gray-600">
          This removes the studio, its photos and all its bookings. This can&apos;t be undone.
        </p>
        <DeleteStudioButton studioId={studio.id} />
      </div>
    </div>
  );
}
