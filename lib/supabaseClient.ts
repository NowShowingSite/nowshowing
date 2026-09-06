import { createBrowserClient } from "@supabase/ssr";

// This reads the project URL + key from environment variables
// (set in .env.local for local dev, and in Vercel's project
// settings for the live site). Nothing secret is hardcoded here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Next.js patches the global fetch function and can cache
        // requests made during a page render, even on pages marked
        // dynamic. This forces every Supabase request to always hit
        // the database fresh, never a cached copy.
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
