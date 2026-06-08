import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle these server-only packages — load them via Node's require at
  // runtime instead. pdf-parse pulls in pdfjs-dist and @napi-rs/canvas (a
  // compiled native .node binary), which the bundler can't process.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
