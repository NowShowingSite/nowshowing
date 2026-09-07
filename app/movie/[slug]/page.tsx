import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import RatingForm from "@/components/RatingForm";

// Same fix as the home page -- always check the database fresh,
// never serve a stale snapshot from build time.
export const dynamic = "force-dynamic";

async function getMovie(slug: string) {
  const supabase = createClient();

  const { data: movie, error } = await supabase
    .from("movies")
    .select("id, title, year, genre, director, runtime, poster_url, tmdb_id, collections, trailer_url")
    .eq("slug", slug)
    .single();

  if (error || !movie) {
    return { movie: null, error: error?.message ?? null, ratings: [] };
  }

  // Fetch ratings for this movie on their own (no nested join --
  // that was silently dropping rows).
  const { data: ratings } = await supabase
    .from("ratings")
    .select("score, user_id")
    .eq("movie_id", movie.id);

  // Fetch the usernames for whoever left those ratings, then match
  // them up in plain JavaScript.
  const userIds = (ratings ?? []).map((r) => r.user_id);
  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  const mergedRatings = (ratings ?? []).map((r) => ({
    score: r.score,
    username: profileMap[r.user_id] ?? "someone",
  }));

  return { movie, error: null, ratings: mergedRatings };
}

export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { movie, error, ratings } = await getMovie(params.slug);

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

  const avg =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : null;

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
        {movie.poster_url ? (
          <div className="poster-col">
            <img src={movie.poster_url} alt="" className="ticket-poster" />
            {movie.trailer_url && (
              <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="trailer-btn">
                ▶ Trailer
              </a>
            )}
          </div>
        ) : (
          <div className="poster-col">
            <div className="ticket-poster" />
            {movie.trailer_url && (
              <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="trailer-btn">
                ▶ Trailer
              </a>
            )}
          </div>
        )}
        <div className="ticket-info">
          {avg && (
            <div className="rating-badge">
              <span className="num">{avg}</span>
              <span className="out">OUT OF 10</span>
            </div>
          )}
          <h1 className="detail-title">
            {movie.title} {movie.year ? `(${movie.year})` : ""}
          </h1>
          <div className="meta-line">
            <span>{movie.genre}</span>
            {movie.runtime && <span className="meta-runtime">{movie.runtime}m</span>}
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

          <h3>Ratings</h3>
          {ratings.length === 0 && <p>No ratings yet — be the first.</p>}
          <ul className="ratings-list">
            {ratings.map((r, i) => (
              <li key={i}>
                <span>{r.username}</span>
                <span style={{ color: "var(--gold)" }}>{r.score}</span>
              </li>
            ))}
          </ul>

          {/* This is a client component -- it needs to know who's
              logged in and handle the form submission interactively. */}
          <RatingForm movieId={movie.id} tmdbId={movie.tmdb_id} />
        </div>
      </div>
    </div>
  );
}
