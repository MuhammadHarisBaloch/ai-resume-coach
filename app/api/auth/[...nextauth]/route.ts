// app/api/auth/[...nextauth]/route.ts
//
// Exposes all of Auth.js's endpoints under /api/auth/* (sign-in, the Google
// callback, sign-out, session, etc.). The [...nextauth] folder is a "catch-all"
// route: it matches any path beneath /api/auth/, and Auth.js's `handlers`
// dispatch each one internally. We just re-export them as GET and POST.

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
