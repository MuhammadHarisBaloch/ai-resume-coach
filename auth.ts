// auth.ts
//
// The single Auth.js (NextAuth v5) configuration for the whole app.
// One NextAuth({...}) call wires everything up and returns four helpers:
//   - handlers : the GET/POST route handlers for /api/auth/*
//   - auth     : read the current session on the server (in pages, routes, etc.)
//   - signIn   : a server action to start a sign-in
//   - signOut  : a server action to sign out
//
// We import these from "@/auth" elsewhere.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/app/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter tells Auth.js to store users/accounts/sessions in our database
  // (via Prisma). This is what makes login persist and what creates the
  // User/Session rows you can see in the database.
  adapter: PrismaAdapter(prisma),

  // Sign-in providers. Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from
  // the environment automatically — no need to pass them here.
  providers: [Google],

  // "database" = the session is stored as a row in the Session table, and the
  // browser holds a cookie with the session token. (The other option, "jwt",
  // keeps everything in a signed cookie with no DB row.)
  session: { strategy: "database" },

  callbacks: {
    // By default the session only carries name/email/image. We also want the
    // database user `id` so we can tag and filter analyses by owner. With the
    // "database" strategy this callback receives the DB user, so we copy its id
    // onto session.user.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
