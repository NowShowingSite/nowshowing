import { NextRequest, NextResponse } from "next/server";

// TMDB names TV genres differently than movie genres (e.g. "Sci-Fi &
// Fantasy" and "Action & Adventure" instead of separate "Science
// Fiction"/"Fantasy" and "Action"/"Adventure"). This splits the TV
// versions into the same atomic genre names movies use, so "By Genre"
// browsing doesn't end up with duplicate near-identical buckets.
function normalizeTvGenre(name: string): string[] {
  const map: Record<string, string[]> = {
    "Action & Adventure": ["Action", "Adventure"],
    "Sci-Fi & Fantasy": ["Science Fiction", "Fantasy"],
    "War & Politics": ["War"],
  };
  return map[name] ?? [name];
}

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  if (!tmdbId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (type === "tv") {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}?append_to_response=credits,videos&api_key=${process.env.TMDB_API_KEY}`
    );
    const data = await res.json();

    const genre = (data.genres ?? [])
      .flatMap((g: any) => normalizeTvGenre(g.name))
      .join(" / ");
    const creators = (data.created_by ?? []).map((c: any) => c.name).join(" & ");

    const videos = data.videos?.results ?? [];
    const trailer =
      videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
      videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer");
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const yearStart = data.first_air_date ? parseInt(data.first_air_date.slice(0, 4)) : null;
    // Still airing ("Returning Series") shows have no end year yet.
    const isOngoing = data.status === "Returning Series" || data.in_production;
    const yearEnd =
      !isOngoing && data.last_air_date ? parseInt(data.last_air_date.slice(0, 4)) : null;

    return NextResponse.json({
      title: data.name,
      year: yearStart,
      yearEnd,
      releaseDate: data.first_air_date || null,
      genre,
      director: creators || "Unknown",
      runtime: null,
      posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      trailerUrl,
    });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits,release_dates,videos&api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await res.json();

  // Some movies (like Avengers: Endgame) have co-directors -- grab
  // everyone credited as "Director," not just the first match.
  const directors = (data.credits?.crew ?? [])
    .filter((c: any) => c.job === "Director")
    .map((c: any) => c.name);
  const directorNames = directors.join(" & ");
  const genre = (data.genres ?? []).map((g: any) => g.name).join(" / ");

  // Prefer an official YouTube trailer; fall back to any YouTube
  // trailer if there's no "official" flag set.
  const videos = data.videos?.results ?? [];
  const trailer =
    videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer");
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

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
    yearEnd: null,
    releaseDate,
    genre,
    director: directorNames || "",
    runtime: data.runtime ?? null,
    posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
    trailerUrl,
  });
}
