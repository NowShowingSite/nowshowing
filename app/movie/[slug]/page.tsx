import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import RatingForm from "@/components/RatingForm";

// Same fix as the home page -- always check the database fresh,
// never serve a stale snapshot from build time.
export const dynamic = "force-dynamic";

// Runtime is stored in minutes -- format as "1h 40m" instead of "100m".
function formatRuntime(minutes: number | null) {
  if (typeof minutes !== "number") return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function getMovie(slug: string) {
  const supabase = createClient();

  const { data: movie, error } = await supabase
    .from("movies")
    .select("id, title, year, genre, director, runtime, poster_url, tmdb_id, collections, trailer_url")
    .eq("slug", slug)
    .single();

  if (error || !movie) {
    return { movie: null, error: error?.message ?? null, avg: null };
  }

  // Just need the scores to compute an average -- no need for
  // usernames anymore since the per-person breakdown isn't shown.
  const { data: ratings } = await supabase
    .from("ratings")
    .select("score")
    .eq("movie_id", movie.id);

  const avg =
    ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : null;

  return { movie, error: null, avg };
}

export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { movie, error, avg } = await getMovie(params.slug);

  if (error) {
    return (
      <div className="detail-wrap">
        <Link href="/" className="back-link">
          ← Back to search
        </Link>
        <p style={{ color: "salmon" }}>Error loading movie: {error}</p>
      </div>
    );
  }
  if (!movie) {
    return (
      <div className="detail-wrap">
        <Link href="/" className="back-link">
          ← Back to search
        </Link>
        <p>Movie not found.</p>
      </div>
    );
  }

  return (
    <div className="detail-wrap">
      <Link href="/" className="back-link">
        ← Back to search
      </Link>
      <div className="ticket">
        {movie.collections && movie.collections.length > 0 && (
          <div className="collection-badge-stack">
            {movie.collections.map((c: string) => (
              <Link key={c} href={`/collection/${encodeURIComponent(c)}`} className="collection-badge">
                {c}
              </Link>
            ))}
          </div>
        )}
        <div className="ticket-layout">
          <div className="poster-col">
            <div className="ticket-poster">
              {movie.poster_url ? (
                <img src={movie.poster_url} alt="" />
              ) : (
                "No poster yet"
              )}
            </div>
            {movie.trailer_url && (
              <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="trailer-btn">
                ▶ Trailer
              </a>
            )}
          </div>
          <div className="ticket-info">
            {/* Clickable rating badge -- click it to enter your score.
                This is a client component since it needs to know who's
                logged in and handle the prompt/submit interactively. */}
            <RatingForm movieId={movie.id} tmdbId={movie.tmdb_id} avg={avg} />

            <h1 className="detail-title">{movie.title}</h1>
            <div className="meta-line">
              <span className="meta-year">{movie.year}</span>
              <span>{movie.genre}</span>
              {movie.runtime && <span className="meta-runtime">{formatRuntime(movie.runtime)}</span>}
            </div>
            <p className="meta-director">
              Director:{" "}
              {movie.director ? (
                <Link href={`/director/${encodeURIComponent(movie.director)}`} className="director-link">
                  {movie.director}
                </Link>
              ) : (
                "Unknown"
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
