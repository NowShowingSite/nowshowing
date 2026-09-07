import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import UpcomingReleases from "@/components/UpcomingReleases";
import MovieBrowser from "@/components/MovieBrowser";

// Without this, Next.js would "bake in" whatever the database looked
// like at build time and serve that same snapshot to everyone until
// the next deploy. This forces it to check the database fresh every
// time someone visits the page.
export const dynamic = "force-dynamic";

// This runs on the server each time the page loads, fetching the
// current list of movies and their ratings straight from Supabase.
async function getMovies() {
  const supabase = createClient();

  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, slug, title, year, poster_url, genre")
    .order("title");

  if (error) {
    // Return the error itself so the page can show exactly what
    // went wrong, instead of silently displaying "no movies."
    return { movies: [], error: error.message };
  }

  // Fetch all ratings separately and group them by movie, rather than
  // using a nested join (which was unreliable -- see movie detail page).
  const { data: ratings } = await supabase.from("ratings").select("movie_id, score");

  const scoresByMovie: Record<string, number[]> = {};
  (ratings ?? []).forEach((r) => {
    if (!scoresByMovie[r.movie_id]) scoresByMovie[r.movie_id] = [];
    scoresByMovie[r.movie_id].push(r.score);
  });

  const mapped = (movies ?? []).map((movie) => {
    const scores = scoresByMovie[movie.id] ?? [];
    const avg =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : "—";
    return { ...movie, avg, count: scores.length };
  });

  return { movies: mapped, error: null };
}

// Picks a movie for today deterministically -- today's date maps to a
// fixed index in the (stably-sorted) movie list. This naturally
// avoids repeating the same movie two days running (as long as there's
// more than one movie) without needing any cooldown/history tracking,
// which is what caused a repeat bug on the old static version.
function pickMovieOfTheDay(movies: any[]) {
  if (movies.length === 0) return null;
  const sorted = [...movies].sort((a, b) => a.id.localeCompare(b.id));
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const index = daysSinceEpoch % sorted.length;
  return sorted[index];
}

export default async function HomePage() {
  const { movies, error } = await getMovies();
  const motd = pickMovieOfTheDay(movies);

  return (
    <>
      {motd && (
        <div className="motd-wrap">
          <Link href={`/movie/${motd.slug}`} className="motd-box">
            <div className="motd-poster">
              {motd.poster_url && <img src={motd.poster_url} alt="" />}
            </div>
            <div className="motd-text">
              <span className="motd-label">Movie of the Day</span>
              <span className="motd-title">
                {motd.title} {motd.year ? `(${motd.year})` : ""}
              </span>
            </div>
          </Link>
        </div>
      )}
      <UpcomingReleases />
      <SearchBar />
      {error && (
        <p style={{ color: "salmon", padding: "0 24px", maxWidth: 720, margin: "0 auto" }}>
          Error loading movies: {error}
        </p>
      )}
      {!error && movies.length === 0 && (
        <p style={{ padding: "0 24px", maxWidth: 720, margin: "0 auto" }}>
          No movies yet — add some in Supabase's Table Editor to get started.
        </p>
      )}
      {!error && movies.length > 0 && <MovieBrowser movies={movies} />}
    </>
  );
}
