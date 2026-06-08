// app/components/coach-form.tsx
//
// The interactive resume-coach form. This is a CLIENT Component ("use client")
// because it uses React state and handles clicks/typing. It used to live in
// app/page.tsx; we moved it here so the page itself can be a Server Component
// that decides whether to show this form (only when signed in).
"use client";

import { useState } from "react";
import Link from "next/link";
import { Suggestions } from "@/app/types";
import Spinner from "@/app/components/spinner";

export default function CoachForm() {
  // --- State: the pieces of information this form tracks over time ---
  const [resume, setResume] = useState(""); // text in the resume box
  const [jobTitle, setJobTitle] = useState(""); // text in the job-title box
  const [file, setFile] = useState<File | null>(null); // an uploaded PDF, if any
  const [loading, setLoading] = useState(false); // is a request in flight?
  const [error, setError] = useState(""); // a message to show on failure
  const [results, setResults] = useState<Suggestions | null>(null); // AI output

  // --- Called when the user clicks "Get Suggestions" ---
  async function handleSubmit() {
    // 1. Basic front-end validation: need a job title AND a resume from
    //    EITHER source (an uploaded file or pasted text).
    if (!jobTitle.trim()) {
      setError("Please enter a target job title.");
      return;
    }
    if (!file && !resume.trim()) {
      setError("Please upload a PDF resume or paste your resume text.");
      return;
    }

    // 2. Reset UI into the "loading" state.
    setError("");
    setResults(null);
    setLoading(true);

    try {
      // 3. Build a FormData so we can send text fields AND a file together.
      //    IMPORTANT: do NOT set the "Content-Type" header yourself — the
      //    browser sets it (with the right multipart boundary) automatically.
      const form = new FormData();
      form.append("jobTitle", jobTitle);
      if (file) form.append("file", file);
      if (resume.trim()) form.append("resume", resume);

      // Send it to OUR backend route (a relative URL works on any port).
      const res = await fetch("/api/suggest", {
        method: "POST",
        body: form,
      });

      // 4. If the server replied with an error status, read its message.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // 5. Success: store the suggestions so React re-renders the results.
      const data: Suggestions = await res.json();
      setResults(data);
    } catch {
      // Network-level failure (server down, no connection, etc.)
      setError("Could not reach the server. Please try again.");
    } finally {
      // 6. Always turn off the loading state, success or failure.
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      {/* ---------- Header ---------- */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Resume Coach
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Upload a PDF or paste your resume, add a target job title, and get
          tailored suggestions.
        </p>
        <Link
          href="/history"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          View saved history →
        </Link>
      </header>

      {/* ---------- Input form ---------- */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-5">
          {/* PDF upload (controlled by the `file` state) */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="file"
              className="text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Upload Resume (PDF)
            </label>
            <input
              id="file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={loading}
              className="block w-full cursor-pointer text-sm text-gray-500 file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 file:transition-colors hover:file:bg-gray-200 disabled:opacity-60 dark:text-gray-400 dark:file:border-gray-700 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700"
            />
            {file && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Divider: make it clear the two inputs are alternatives */}
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            or paste text
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Resume textarea (controlled by the `resume` state) */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="resume"
              className="text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Your Resume
            </label>
            <textarea
              id="resume"
              rows={10}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              disabled={loading}
              placeholder="Paste your resume text here..."
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          {/* Target job title input (controlled by the `jobTitle` state) */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="jobTitle"
              className="text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Target Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={loading}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          {/* Submit button: disabled + relabeled while loading */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Analyzing…" : "Get Suggestions"}
          </button>
        </div>
      </section>

      {/* ---------- Error message (only shows when `error` is set) ---------- */}
      {error && (
        <div
          role="alert"
          className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <span aria-hidden="true" className="shrink-0">
            ⚠
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* ---------- Results area ---------- */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Suggestions</h2>

        {/* Three possible states: nothing yet, loading, or real results. */}
        {!results && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Your suggestions will appear here after you click “Get Suggestions”.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <Spinner className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Analyzing your resume… this can take a few seconds.
          </div>
        )}

        {results && (
          <div className="flex flex-col gap-6">
            {/* Improved summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Improved Summary
              </h3>
              <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {results.summary}
              </p>
            </div>

            {/* Improved bullet points */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Suggested Bullet Points
              </h3>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {results.bullets.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            </div>

            {/* Keyword optimization */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Keyword Optimization
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
