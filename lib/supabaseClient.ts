import { createBrowserClient } from "@supabase/ssr";

// This reads the project URL + key from environment variables
// (set in .env.local for local dev, and in Vercel's project
// settings for the live site). Nothing secret is hardcoded here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
