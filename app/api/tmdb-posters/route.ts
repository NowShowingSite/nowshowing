import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get("id");
  if (!tmdbId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await res.json();

  const posters = (data.posters ?? [])
    .slice(0, 20)
    .map((p: any) => ({
      url: `https://image.tmdb.org/t/p/w500${p.file_path}`,
      language: p.iso_639_1,
    }));

  return NextResponse.json({ posters });
}
