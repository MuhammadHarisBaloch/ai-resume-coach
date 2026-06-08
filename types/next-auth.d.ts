// types/next-auth.d.ts
//
// "Module augmentation": we're adding to next-auth's built-in types rather than
// replacing them. This tells TypeScript that `session.user` also has an `id`
// (which we set in the session callback in auth.ts). Without this, TypeScript
// would complain that `session.user.id` doesn't exist.

import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]; // keep the default fields (name, email, image)
  }
}
