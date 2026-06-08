// app/history/page.tsx
//
// The History page, reachable at /history (folder name = URL path).
//
// This is a SERVER Component (no "use client"), and it's `async`. That lets it
// query the database DIRECTLY — no API route needed. Because it runs only on
// the server, the database credentials and query never reach the browser.

import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";
import type { Suggestions } from "@/app/types";

// Always read fresh from the DB on each request (never serve a cached snapshot),
// so a newly-saved analysis shows up immediately.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  // Who's asking? Read the trusted session on the server.
  const session = await auth();

  // Not signed in → don't query anyone's data; show a prompt instead.
  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please sign in (top-right) to see your saved analyses.
        </p>
      </main>
    );
  }

  // Read the most recent 50 analyses THAT BELONG TO THIS USER.
  // The `where: { userId }` filter is what actually enforces "you only see your
  // own data" — it's applied by the database, so there's no way around it.
  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      {/* ---------- Header ---------- */}
      <header className="mb-8">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to coach
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          History
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your saved analyses, most recent first.
        </p>
      </header>

      {/* ---------- Empty state ---------- */}
      {analyses.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-500">
          No saved analyses yet. Run one from the{" "}
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            coach page
          </Link>{" "}
          and it will appear here.
        </p>
      )}

      {/* ---------- List of saved analyses ---------- */}
      <div className="flex flex-col gap-6">
        {analyses.map((analysis) => {
          // `result` is stored as JSON, so Prisma types it loosely. We told the
          // DB it holds our Suggestions shape, so we cast it back to that type.
          const result = analysis.result as unknown as Suggestions;

          return (
            <div
              key={analysis.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Title + timestamp — stacks on mobile, side-by-side on >=sm. */}
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <h2 className="text-lg font-semibold">{analysis.jobTitle}</h2>
                <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {analysis.createdAt.toLocaleString()}
                </time>
              </div>

              {/* Summary */}
              <p className="mb-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {result.summary}
              </p>

              {/* Bullets */}
              <ul className="mb-3 flex list-disc flex-col gap-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {result.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>

              {/* Keywords */}
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
