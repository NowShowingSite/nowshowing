import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get("id");
  if (!tmdbId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits,release_dates&api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await res.json();

  const director = (data.credits?.crew ?? []).find((c: any) => c.job === "Director");
  const genre = (data.genres ?? []).map((g: any) => g.name).join(" / ");

  // TMDB's top-level "release_date" is whichever country released it
  // FIRST globally, not necessarily the US date. Look up the US entry
  // specifically instead, preferring a theatrical release (type 3) if
  // there's more than one US date listed.
  let releaseDate = data.release_date || null;
  const usEntry = (data.release_dates?.results ?? []).find((r: any) => r.iso_3166_1 === "US");
  if (usEntry?.release_dates?.length) {
    const theatrical = usEntry.release_dates.find((rd: any) => rd.type === 3);
    releaseDate = (theatrical ?? usEntry.release_dates[0]).release_date.slice(0, 10);
  }

  return NextResponse.json({
    title: data.title,
    year: releaseDate ? parseInt(releaseDate.slice(0, 4)) : null,
    releaseDate,
    genre,
    director: director?.name ?? "",
    runtime: data.runtime ?? null,
    posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
  });
}
