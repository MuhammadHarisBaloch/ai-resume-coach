// app/components/auth-status.tsx
//
// Shows the current auth state: either a "Sign in with Google" button, or the
// logged-in user's name/email plus a "Sign out" button.
//
// This is a SERVER Component (no "use client"): it can call `auth()` directly
// to read the session on the server. The buttons submit tiny <form>s whose
// `action` is a SERVER ACTION (note the "use server" directive) — so sign-in
// and sign-out run on the server, never in the browser.

import { auth, signIn, signOut } from "@/auth";
import SubmitButton from "@/app/components/submit-button";

export default async function AuthStatus() {
  const session = await auth();

  // Not logged in → show the sign-in button.
  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <SubmitButton
          pendingText="Signing in…"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Sign in with Google
        </SubmitButton>
      </form>
    );
  }

  // Logged in → show name/email + sign-out button.
  // min-w-0 + truncate let a long email shrink/ellipsize instead of overflowing
  // on small screens; the button is shrink-0 so it stays fully tappable.
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="min-w-0 truncate text-sm text-gray-700 dark:text-gray-300">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <SubmitButton
          pendingText="Signing out…"
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
