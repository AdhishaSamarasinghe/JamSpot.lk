import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export default async function Header() {
  const profile = await getProfile();

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">
            ♪
          </span>
          JamSpot<span className="text-brand-600">.lk</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          {profile?.role === "owner" && (
            <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-gray-100">
              Dashboard
            </Link>
          )}
          {profile?.role === "musician" && (
            <Link href="/bookings" className="rounded-lg px-3 py-2 hover:bg-gray-100">
              My Bookings
            </Link>
          )}
          {profile ? (
            <form action={signOut}>
              <button className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">Log out</button>
            </form>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-gray-100">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary px-3 py-2">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
