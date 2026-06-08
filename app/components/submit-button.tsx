// app/components/submit-button.tsx
//
// A submit button that automatically shows a "pending" state while the form's
// server action is running.
//
// HOW: React's useFormStatus() reports the status of the nearest parent <form>.
// It ONLY works inside a Client Component placed inside that form — which is why
// this is its own "use client" component (the forms themselves live in Server
// Components). While pending: the button disables itself (prevents double-clicks)
// and shows a spinner + the `pendingText`.
"use client";

import { useFormStatus } from "react-dom";
import Spinner from "@/app/components/spinner";

export default function SubmitButton({
  children,
  pendingText,
  className = "",
}: {
  children: React.ReactNode; // normal (idle) label
  pendingText: string; // label shown while submitting
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {pending && <Spinner className="h-4 w-4" />}
      {pending ? pendingText : children}
    </button>
  );
}
