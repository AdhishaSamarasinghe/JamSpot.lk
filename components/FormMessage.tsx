export default function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }
  if (message) {
    return <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>;
  }
  return null;
}
