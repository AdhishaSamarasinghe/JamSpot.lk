import Link from "next/link";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-gray-600">Welcome back to JamSpot.lk</p>
      <div className="card mt-6 p-5">
        <LoginForm
          next={next}
          initialError={error === "confirm" ? "That confirmation link is invalid or has expired." : undefined}
        />
      </div>
      <p className="mt-4 text-center text-sm text-gray-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-600">
          Create an account
        </Link>
      </p>
    </div>
  );
}
