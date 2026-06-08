// app/api/suggest/route.ts
//
// This is a BACKEND API route ("Route Handler" in Next.js App Router terms).
// Because the file is named route.ts and lives at app/api/suggest/, its URL is:
//
//     POST /api/suggest
//
// IMPORTANT: this code runs ONLY on the server. It is never sent to the
// browser. That is why we can safely read the secret API key here, AND why we
// do PDF text-extraction here (pdf-parse is a Node library the browser can't run).

import { PDFParse } from "pdf-parse";
import { Suggestions } from "@/app/types";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

// pdf-parse needs the full Node.js runtime (it uses Node APIs + a native
// module), so we explicitly opt out of the lighter "edge" runtime.
export const runtime = "nodejs";

// The Gemini REST endpoint for the model we're using.
// We call this with a plain fetch() — no SDK needed.
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Reject uploads bigger than this so a huge file can't tie up the server.
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// Shown when a PDF has no readable text (e.g. a scanned/image-only resume).
const FRIENDLY_PDF_ERROR =
  "Couldn't read text from this file — please paste your resume text instead.";

// Next.js maps the exported function name to the HTTP method.
// So `export async function POST` handles POST requests to /api/suggest.
export async function POST(req: Request) {
  // Everything is wrapped in a try/catch so that ANY unexpected error is
  // logged readably (message + stack) in Vercel's function logs, instead of
  // surfacing only as "FUNCTION_INVOCATION_FAILED". (TEMP debugging aid.)
  try {
    // --- TEMP DIAGNOSTICS: confirm env vars reached the function in prod ---
    // We log only presence + length for secrets (never the value). AUTH_URL is
    // your PUBLIC site URL (not a secret), so we log it fully — a malformed
    // AUTH_URL (e.g. missing "https://") makes Auth.js throw "Invalid URL".
    console.log("[/api/suggest] env check:", {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
        ? `present (length ${process.env.GEMINI_API_KEY.length})`
        : "MISSING",
      AUTH_URL: process.env.AUTH_URL ?? "MISSING",
      AUTH_SECRET: process.env.AUTH_SECRET ? "present" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "present" : "MISSING",
    });

    // --- 0. Require a logged-in user (BACKEND enforcement) ---
    // auth() reads the session cookie and looks up the session in the database.
    // NOTE: auth() also builds URLs from AUTH_URL — if AUTH_URL is malformed,
    // this is what throws "TypeError: Invalid URL" (now caught below).
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "You must be signed in to do this." },
        { status: 401 }
      );
    }

  // --- 1. Read the multipart form (text fields AND an optional file) ---
  // The frontend now sends FormData (so it can include a file), so we use
  // req.formData() instead of req.json(). Text fields come back as strings;
  // an uploaded file comes back as a File object.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobTitle = String(form.get("jobTitle") ?? "").trim();
  const pastedResume = String(form.get("resume") ?? "").trim();
  const file = form.get("file"); // a File if one was uploaded, else null

  // --- 2. If a PDF was uploaded, extract its text HERE on the server ---
  // An LLM only reads text, so we must turn the PDF's bytes into plain text
  // BEFORE sending it to Gemini. pdf-parse does that extraction.
  let extracted = "";
  if (file instanceof File && file.size > 0) {
    // Guard: only accept PDFs, and cap the size.
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return Response.json(
        { error: "Please upload a PDF file (or paste your resume text)." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "That file is too large. Please upload a PDF under 5 MB." },
        { status: 400 }
      );
    }

    try {
      // Turn the uploaded file into a Buffer of raw bytes, hand it to
      // pdf-parse, and read back the extracted text.
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy(); // release the parser's resources
      extracted = result.text.trim();
    } catch (err) {
      // A corrupt/unreadable PDF must NOT crash the route. Log the real
      // reason server-side and return a friendly message to the user.
      console.error("PDF parse failed", err);
      return Response.json({ error: FRIENDLY_PDF_ERROR }, { status: 422 });
    }

    // Edge case: a scanned / image-only PDF parses fine but has NO text.
    if (!extracted) {
      return Response.json({ error: FRIENDLY_PDF_ERROR }, { status: 422 });
    }
  }

  // The resume text is the extracted PDF text if we got any, else the pasted text.
  const resume = extracted || pastedResume;

  // --- 3. Validate the inputs ---
  // 400 = "Bad Request": the client sent us something we can't work with.
  if (!resume || !jobTitle) {
    return Response.json(
      {
        error:
          "Please provide a resume (upload a PDF or paste text) and a target job title.",
      },
      { status: 400 }
    );
  }

  // --- 4. Read the secret key from the environment ---
  // process.env reads from .env.local (which is git-ignored). The key never
  // leaves the server. If it's missing, that's a server-side setup problem.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  // --- 5. Build the prompt ---
  // We tell Gemini exactly what role to play and EXACTLY what JSON to return.
  // Being explicit about the JSON keys makes the response easy to parse.
  const prompt = `You are an expert resume coach helping someone apply for the role of "${jobTitle}".

Here is their current resume:
"""
${resume}
"""

Rewrite and improve it for this target role. Respond with ONLY a JSON object in exactly this shape:
{
  "summary": "a stronger 2-3 sentence professional summary",
  "bullets": ["improved resume bullet point", "another improved bullet", "..."],
  "keywords": ["relevant keyword", "another keyword", "..."]
}

Use strong action verbs and quantify impact where possible. Provide 4-6 bullets and 6-10 keywords.`;

  // --- 6. Call the Gemini API ---
  // We send the prompt and ask Gemini to reply with clean JSON via
  // responseMimeType. We also use try/catch in case the network call throws.
  let geminiRes: Response;
  try {
    geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The key travels from our server to Google — never to the browser.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // Ask Gemini to return raw JSON (no ```json markdown fences).
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    // 502 = "Bad Gateway": we (the server) failed talking to an upstream service.
    return Response.json(
      { error: "Could not reach the AI service. Please try again." },
      { status: 502 }
    );
  }

  // If Gemini returned an error status (bad key, quota, overload, etc.)...
  // We log the real reason to the SERVER console (safe — not shown to users),
  // and return a friendly message to the browser. Note: Gemini's free tier
  // sometimes returns 503 "high demand" — that's transient, just try again.
  if (!geminiRes.ok) {
    console.error("Gemini error", geminiRes.status, await geminiRes.text());
    return Response.json(
      { error: "The AI request failed. Please try again in a moment." },
      { status: 502 }
    );
  }

  // --- 7. Extract and parse Gemini's answer ---
  // Gemini's response wraps the text deep inside this structure:
  //   { candidates: [ { content: { parts: [ { text: "<the JSON string>" } ] } } ] }
  // So we dig out that text, then JSON.parse() it into our Suggestions object.
  let result: Suggestions;
  try {
    const data = await geminiRes.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from AI.");
    }

    result = JSON.parse(text) as Suggestions;
  } catch {
    return Response.json(
      { error: "Could not read the AI response. Please try again." },
      { status: 502 }
    );
  }

  // --- 8. Save the result to the database (Prisma -> Neon) ---
  // We persist the input + the AI result so it shows up on the /history page.
  // This is wrapped in try/catch and is NON-FATAL: if saving fails, we log it
  // but STILL return the suggestions — the user shouldn't lose their result
  // just because the database hiccupped.
  try {
    await prisma.analysis.create({
      // userId comes from the trusted server session — NOT from the request
      // body. That's what guarantees an analysis is owned by the real signed-in
      // user and can't be forged by the client.
      data: { jobTitle, resumeText: resume, result, userId: session.user.id },
    });
  } catch (e) {
    console.error("Failed to save analysis to the database", e);
  }

  // --- 9. Send the clean result back to the frontend ---
  // 200 OK with the parsed JSON. The browser's fetch() will receive this.
    return Response.json(result);
  } catch (err) {
    // CATCH-ALL: any unexpected throw lands here — e.g. auth() "Invalid URL"
    // from a bad AUTH_URL, a DB/connection failure, or a native-module crash.
    // We log the FULL message + stack so it's readable in Vercel's logs, and
    // (temporarily) return the message to the client to speed up debugging.
    const e = err as Error;
    console.error("[/api/suggest] UNHANDLED ERROR:", e?.name, "-", e?.message);
    console.error("[/api/suggest] STACK:", e?.stack);
    return Response.json(
      {
        error: "Server error — check the function logs.",
        detail: e?.message ?? String(err), // TEMP: remove after debugging
      },
      { status: 500 }
    );
  }
}
