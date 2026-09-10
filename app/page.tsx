import { createClient } from "@/lib/supabaseClient";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import Image from "next/image";
import SearchBar from "@/components/SearchBar";
import UpcomingReleases from "@/components/UpcomingReleases";
import MovieBrowser from "@/components/MovieBrowser";
import CountLink from "@/components/CountLink";

// Without this, Next.js would "bake in" whatever the database looked
// like at build time and serve that same snapshot to everyone until
// the next deploy. This forces the PAGE itself to always render fresh
// per request. The underlying data fetch below is separately cached
// for a short window via unstable_cache -- so the page still renders
// live every time, but doesn't necessarily hit the database every time.
export const dynamic = "force-dynamic";

// Keeps up to 2 decimal places, but trims trailing zeros -- 9.50
// shows as "9.5", 10.00 shows as "10", but 9.25 stays exactly 9.25.
function formatRating(n: number) {
  return parseFloat(n.toFixed(2)).toString();
}

// The actual database round-trip -- movies + every rating, needed to
// compute averages. This was being run fresh on literally every single
// visit to the home page, even if the last visitor loaded the exact
// same thing a second ago. Wrapping it in unstable_cache means it's
// only actually re-run once every 30 seconds; visitors in between get
// an instant cached result instead of waiting on a fresh fetch.
// Search, a movie's own page, watchlist, and Recently Searched are all
// separate queries elsewhere and are NOT affected by this cache.
const fetchMoviesAndRatings = unstable_cache(
  async () => {
    const supabase = createClient();

    // These don't depend on each other -- ratings pulls every row
    // unfiltered, not scoped to whatever movies came back. Running
    // them together instead of one after another saves a full
    // round-trip of latency.
    const [moviesResult, ratingsResult] = await Promise.all([
      supabase
        .from("movies")
        .select("id, slug, title, year, poster_url, genre, media_type")
        .order("title"),
      supabase.from("ratings").select("movie_id, score"),
    ]);

    const { data: movies, error } = moviesResult;
    if (error) {
      return { movies: [], error: error.message };
    }
    const { data: ratings } = ratingsResult;

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
  },
  ["home-movies-and-ratings"],
  { revalidate: 30 }
);

async function getMovies() {
  return fetchMoviesAndRatings();
}

// Red at 0, green at 10, yellow in between -- same scale used everywhere
// a rating shows up on the site.
function ratingColor(avgText: string) {
  const n = parseFloat(avgText);
  if (isNaN(n)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, n));
  return `hsl(${(clamped / 10) * 120}, 70%, 50%)`;
}

// Small deterministic string hash (djb2-style) -- same input always
// produces the same output, with no external dependency needed.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

// Gets today's date as "YYYY-MM-DD" in US Eastern time specifically --
// not the server's own timezone (which on Vercel is UTC). Using
// Intl's built-in timezone conversion means this automatically
// accounts for EST/EDT (daylight saving) transitions correctly,
// without needing any extra date library.
function getEasternDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Picks a movie for today deterministically. Each movie gets a score
// of hash(today's date + its id), and whichever scores highest wins.
// The date must come FIRST in that string -- this hash is a rolling
// left-to-right accumulator, so later characters barely move the
// final result. With the date appended at the end, the movie's own id
// completely dominated the score and the date had almost no effect,
// which is why the "daily" pick was actually stuck on the same movie
// indefinitely. Putting the date first fixes that.
//
// This approach is also stable as the catalog grows: adding a new
// movie only changes today's pick if that specific new movie happens
// to outscore the current one -- unlike a modulo-based index, which
// reshuffles the pick for EVERY movie whenever the total count changes
// (that was the earlier bug behind "movie of the day keeps switching
// randomly" while adding titles). TV shows are excluded -- this is
// "Movie of the Day," not "Title of the Day."
function pickMovieOfTheDay(movies: any[]) {
  const eligible = movies.filter((m) => m.media_type !== "tv");
  if (eligible.length === 0) return null;
  const todayStr = getEasternDateString(); // "YYYY-MM-DD", Eastern time
  return eligible.reduce((best, m) =>
    hashString(todayStr + m.id) > hashString(todayStr + best.id) ? m : best
  );
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
            <Link href={`/movie/${motd.slug}`} className="motd-box">
              <div className="motd-poster">
                {motd.poster_url && (
                  <Image src={motd.poster_url} alt="" width={63} height={95} />
                )}
              </div>
              <div className="motd-text">
                <span className="motd-label">Movie of the Day</span>
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

        <SearchBar movies={movies} />
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
