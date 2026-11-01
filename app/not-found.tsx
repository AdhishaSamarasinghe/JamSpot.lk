import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm pt-16 text-center">
      <p className="text-5xl">🎸</p>
      <h1 className="mt-4 text-xl font-bold">Page not found</h1>
      <p className="mt-1 text-sm text-gray-600">This page or studio doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary mt-6">
        Browse studios
      </Link>
    </div>
  );
}
