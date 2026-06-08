import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthStatus from "@/app/components/auth-status";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Resume Coach",
  description: "Paste your resume and a target job title to get AI-powered suggestions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: some browser extensions (Grammarly,
          ColorZilla, dark-mode/translate tools) inject attributes onto <body>
          before React hydrates, which triggers a harmless attribute-mismatch
          warning. This suppresses it for THIS element's attributes only — it
          does not hide real hydration issues inside the app. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* App-wide top bar: brand on the left, auth state on the right.
            Inner content is constrained to the same width as the page body so
            the brand/auth align with the main column. */}
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
            <Link href="/" className="shrink-0 text-sm font-semibold">
              AI Resume Coach
            </Link>
            {/* Takes the remaining width and aligns right; min-w-0 lets a long
                email truncate instead of pushing the layout wide on mobile. */}
            <div className="flex min-w-0 flex-1 justify-end">
              <AuthStatus />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
