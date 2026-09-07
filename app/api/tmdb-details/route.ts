import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get("id");
  if (!tmdbId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits&api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await res.json();

  const director = (data.credits?.crew ?? []).find((c: any) => c.job === "Director");
  const genre = (data.genres ?? []).map((g: any) => g.name).join(" / ");

  return NextResponse.json({
    title: data.title,
    year: data.release_date ? parseInt(data.release_date.slice(0, 4)) : null,
    releaseDate: data.release_date || null,
    genre,
    director: director?.name ?? "",
    runtime: data.runtime ?? null,
    posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
  });
}
