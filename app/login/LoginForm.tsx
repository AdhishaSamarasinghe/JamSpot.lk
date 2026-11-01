"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";

export default function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action] = useActionState(signIn, initialError ? { error: initialError } : undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <FormMessage error={state?.error} message={state?.message} />
      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
    </form>
  );
}
