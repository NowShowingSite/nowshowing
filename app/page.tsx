import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import UpcomingReleases from "@/components/UpcomingReleases";
import MovieBrowser from "@/components/MovieBrowser";
import CountLink from "@/components/CountLink";

// Without this, Next.js would "bake in" whatever the database looked
// like at build time and serve that same snapshot to everyone until
// the next deploy. This forces it to check the database fresh every
// time someone visits the page.
export const dynamic = "force-dynamic";

// Keeps up to 2 decimal places, but trims trailing zeros -- 9.50
// shows as "9.5", 10.00 shows as "10", but 9.25 stays exactly 9.25.
function formatRating(n: number) {
  return parseFloat(n.toFixed(2)).toString();
}

// This runs on the server each time the page loads, fetching the
// current list of movies and their ratings straight from Supabase.
async function getMovies() {
  const supabase = createClient();

  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, slug, title, year, poster_url, genre, media_type")
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
        ? formatRating(scores.reduce((a, b) => a + b, 0) / scores.length)
        : "—";
    return { ...movie, avg, count: scores.length };
  });

  return { movies: mapped, error: null };
}

// Red at 0, green at 10, yellow in between -- same scale used everywhere
// a rating shows up on the site.
function ratingColor(avgText: string) {
  const n = parseFloat(avgText);
  if (isNaN(n)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, n));
  return `hsl(${(clamped / 10) * 120}, 70%, 50%)`;
}

// Picks a movie for today deterministically -- today's date maps to a
// fixed index in the (stably-sorted) movie list. This naturally
// avoids repeating the same movie two days running (as long as there's
// more than one movie) without needing any cooldown/history tracking,
// which is what caused a repeat bug on the old static version.
// TV shows are excluded -- this is "Movie of the Day," not "Title of
// the Day."
function pickMovieOfTheDay(movies: any[]) {
  const eligible = movies.filter((m) => m.media_type !== "tv");
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const index = daysSinceEpoch % sorted.length;
  return sorted[index];
}

export default async function HomePage() {
  const { movies, error } = await getMovies();
  const motd = pickMovieOfTheDay(movies);
  const movieCount = movies.filter((m: any) => m.media_type !== "tv").length;
  const tvCount = movies.filter((m: any) => m.media_type === "tv").length;

  return (
    <>
      <div className="hero-wrap">
        {motd && (
          <div className="motd-wrap">
            <span className="motd-label">Movie of the Day</span>
            <Link href={`/movie/${motd.slug}`} className="motd-box">
              <div className="motd-poster">
                {motd.poster_url && <img src={motd.poster_url} alt="" />}
              </div>
              <div className="motd-text">
                <span className="motd-title">{motd.title}</span>
                <span className="motd-meta">
                  {motd.year ?? ""} -{" "}
                  <span style={{ color: motd.count > 0 ? ratingColor(motd.avg) : "var(--text)" }}>
                    {motd.count > 0 ? motd.avg : "N/A"}
                  </span>
                </span>
              </div>
            </Link>
          </div>
        )}

        <div className="movie-count">
          <span className="count-label">Total Movie Count:</span>
          <CountLink movies={movies} mediaType="movie" count={movieCount} />
          <span className="count-label">Total TV Count:</span>
          <CountLink movies={movies} mediaType="tv" count={tvCount} />
        </div>

        <div className="marquee-wrap">
          <div className="marquee-lights">
            <span className="marquee-glow"></span>
            <h1 className="site-title">Now Showing</h1>
          </div>
          <p className="site-tagline">Ratings from people whose opinions actually matter</p>
          <UpcomingReleases />
        </div>

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
      </div>
    </>
  );
}
