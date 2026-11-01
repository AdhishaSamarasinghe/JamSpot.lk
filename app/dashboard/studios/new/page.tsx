import Link from "next/link";
import StudioForm from "@/components/StudioForm";
import { requireRole } from "@/lib/auth";

export default async function NewStudioPage() {
  const profile = await requireRole("owner", "/dashboard/studios/new");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard" className="text-sm text-gray-600">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold">Add a studio</h1>
      <StudioForm ownerId={profile.id} />
    </div>
  );
}
