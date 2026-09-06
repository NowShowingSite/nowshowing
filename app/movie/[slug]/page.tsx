import { createClient } from "@/lib/supabaseClient";
import RatingForm from "@/components/RatingForm";

// Same fix as the home page -- always check the database fresh,
// never serve a stale snapshot from build time.
export const dynamic = "force-dynamic";

async function getMovie(slug: string) {
  const supabase = createClient();

  const { data: movie, error } = await supabase
    .from("movies")
    .select("id, title, year, genre, director, runtime")
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
    return <p style={{ padding: 24, color: "salmon" }}>Error loading movie: {error}</p>;
  }
  if (!movie) return <p style={{ padding: 24 }}>Movie not found.</p>;

  return (
    <div className="movie-list">
      <h1>
        {movie.title} {movie.year ? `(${movie.year})` : ""}
      </h1>
      <p>
        {movie.genre} {movie.runtime ? `· ${movie.runtime}m` : ""}
      </p>
      <p>Director: {movie.director}</p>

      <h3>Ratings</h3>
      <p style={{ fontSize: "0.8rem", color: "#888" }}>
        Debug: rendered at {new Date().toISOString()}, found {ratings.length} rating(s)
      </p>
      {ratings.length === 0 && <p>No ratings yet — be the first.</p>}
      <ul>
        {ratings.map((r, i) => (
          <li key={i}>
            {r.username}: {r.score}
          </li>
        ))}
      </ul>

      {/* This is a client component -- it needs to know who's
          logged in and handle the form submission interactively. */}
      <RatingForm movieId={movie.id} />
    </div>
  );
}
