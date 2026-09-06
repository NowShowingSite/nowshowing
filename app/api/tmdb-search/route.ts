import { NextRequest, NextResponse } from "next/server";

// This runs on the server, never in the visitor's browser -- so the
// TMDB_API_KEY environment variable (no NEXT_PUBLIC_ prefix) stays
// private. The browser only ever talks to this route, never to TMDB
// directly.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await res.json();

  const results = (data.results ?? []).slice(0, 8).map((m: any) => ({
    tmdbId: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    posterPath: m.poster_path,
  }));

  return NextResponse.json({ results });
}
