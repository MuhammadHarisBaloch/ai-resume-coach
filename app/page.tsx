// app/page.tsx
//
// The home page is now a SERVER Component (no "use client"): it runs on the
// server, so it can read the session with auth() and decide what to render.
//   - signed in  → show the interactive <CoachForm /> (a Client Component)
//   - signed out → show a prompt to sign in
//
// This "server gate wrapping a client island" is a core App Router pattern.
// NOTE: this gate is for UX. The REAL protection is the 401 check inside
// app/api/suggest/route.ts — even if someone bypassed this page, the API
// refuses to do anything without a valid session.

import { auth, signIn } from "@/auth";
import CoachForm from "@/app/components/coach-form";
import SubmitButton from "@/app/components/submit-button";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="relative mx-auto flex w-full max-w-3xl flex-col items-center overflow-hidden px-4 py-20 text-center sm:py-28">
        {/* Soft gradient accent behind the hero (decorative, non-interactive). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-blue-500/15 via-indigo-500/5 to-transparent blur-2xl dark:from-blue-400/15 dark:via-indigo-400/10"
        />

        <h1 className="animate-fade-in-up text-4xl font-bold tracking-tight sm:text-5xl">
          AI Resume Coach
        </h1>

        <p
          className="animate-fade-in-up mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-400"
          style={{ animationDelay: "120ms" }}
        >
          Tailor your resume to any job in seconds. Sign in to get AI-powered
          suggestions — saved privately to your account.
        </p>

        {/* Small feature line for a more engaging hero. */}
        <div
          className="animate-fade-in-up mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-medium text-gray-500 dark:text-gray-400"
          style={{ animationDelay: "200ms" }}
        >
          <span>Stronger summary</span>
          <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
            ·
          </span>
          <span>Better bullet points</span>
          <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
            ·
          </span>
          <span>Keyword tips</span>
        </div>

        {/* Call-to-action. The form submits a server action that starts the
            Google sign-in flow; SubmitButton shows a pending state. */}
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          className="animate-fade-in-up mt-8"
          style={{ animationDelay: "280ms" }}
        >
          <SubmitButton
            pendingText="Signing in…"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            Sign in with Google
          </SubmitButton>
        </form>
      </main>
    );
  }

  return <CoachForm />;
}
