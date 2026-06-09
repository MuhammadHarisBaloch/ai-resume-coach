import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No special config needed. (We previously externalized pdf-parse/@napi-rs/canvas
     for its native binary; we've since switched to unpdf, which is pure JS.) */
};

export default nextConfig;
