"use client";

import { useActionState, useState } from "react";
import { signUp } from "@/app/actions/auth";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";

const ROLES = [
  { value: "musician", title: "I'm a musician", text: "Find and book studios" },
  { value: "owner", title: "I own a studio", text: "List my studio and get bookings" },
] as const;

export default function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  const [role, setRole] = useState<"musician" | "owner">("musician");

  if (state?.message) return <FormMessage message={state.message} />;

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className="label">How will you use JamSpot?</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                role === r.value
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="sr-only"
              />
              <span className="block font-semibold">{r.title}</span>
              <span className="block text-xs text-gray-600">{r.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="name" className="label">
          Full name
        </label>
        <input id="name" name="name" autoComplete="name" required className="input" />
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="077 123 4567"
          required
          className="input"
        />
      </div>
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
          autoComplete="new-password"
          minLength={6}
          required
          className="input"
        />
      </div>
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
