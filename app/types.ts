// app/types.ts
//
// A shared TypeScript type describing the shape of the AI's suggestions.
// Both the backend (app/api/suggest/route.ts) and the frontend (app/page.tsx)
// import this, so they always agree on the data structure.
//
// This file contains ONLY types — no runtime code — so it's safe to import in
// both server and client files.

export type Suggestions = {
  /** A rewritten, stronger professional summary paragraph. */
  summary: string;
  /** Improved resume bullet points, one string per bullet. */
  bullets: string[];
  /** Keywords to add for the target job (e.g. for ATS / recruiters). */
  keywords: string[];
};
