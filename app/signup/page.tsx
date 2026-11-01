import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="mt-1 text-sm text-gray-600">Book studios or list your own. It&apos;s free.</p>
      <div className="card mt-6 p-5">
        <SignupForm />
      </div>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
