import { createClient } from "@/lib/supabaseClient";
import RatingForm from "@/components/RatingForm";

// Same fix as the home page -- always check the database fresh,
// never serve a stale snapshot from build time.
export const dynamic = "force-dynamic";

async function getMovie(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("movies")
    .select("id, title, year, genre, director, runtime, ratings(score, profiles(username))")
    .eq("slug", slug)
    .single();

  // Debug: query ratings directly (no join) to compare against the
  // nested version above.
  let rawRatings = null;
  let rawError = null;
  if (data) {
    const result = await supabase
      .from("ratings")
      .select("*")
      .eq("movie_id", data.id);
    rawRatings = result.data;
    rawError = result.error?.message ?? null;
  }

  return { movie: data, error: error?.message ?? null, rawRatings, rawError };
}

export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { movie, error, rawRatings, rawError } = await getMovie(params.slug);

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
      {/* Temporary debug lines -- safe to remove later. */}
      <p style={{ fontSize: "0.8rem", color: "#888" }}>
        Debug: movie id = {movie.id}, joined ratings found = {movie.ratings.length}
        <br />
        Debug (raw, no join): {rawError ? `error: ${rawError}` : `${rawRatings?.length ?? 0} row(s)`}
        {rawRatings && rawRatings.length > 0 && (
          <> — {JSON.stringify(rawRatings)}</>
        )}
      </p>
      {movie.ratings.length === 0 && <p>No ratings yet — be the first.</p>}
      <ul>
        {movie.ratings.map((r: any, i: number) => (
          <li key={i}>
            {r.profiles?.username ?? "someone"}: {r.score}
          </li>
        ))}
      </ul>

      {/* This is a client component -- it needs to know who's
          logged in and handle the form submission interactively. */}
      <RatingForm movieId={movie.id} />
    </div>
  );
}
