import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";

// Without this, Next.js would "bake in" whatever the database looked
// like at build time and serve that same snapshot to everyone until
// the next deploy. This forces it to check the database fresh every
// time someone visits the page.
export const dynamic = "force-dynamic";

// This runs on the server each time the page loads, fetching the
// current list of movies and their ratings straight from Supabase.
async function getMovies() {
  const supabase = createClient();

  const { data: movies } = await supabase
    .from("movies")
    .select("id, slug, title, year, ratings(score)")
    .order("title");

  return (movies ?? []).map((movie: any) => {
    const scores = movie.ratings.map((r: any) => r.score);
    const avg =
      scores.length > 0
        ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1)
        : "—";
    return { ...movie, avg, count: scores.length };
  });
}

export default async function HomePage() {
  const movies = await getMovies();

  return (
    <div className="movie-list">
      <h1>All Movies</h1>
      {movies.length === 0 && (
        <p>No movies yet — add some in Supabase's Table Editor to get started.</p>
      )}
      {movies.map((movie: any) => (
        <Link key={movie.id} href={`/movie/${movie.slug}`} className="movie-row">
          <span>
            {movie.title} {movie.year ? `(${movie.year})` : ""}
          </span>
          <span className="avg-score">
            {movie.avg} {movie.count > 0 && `(${movie.count})`}
          </span>
        </Link>
      ))}
    </div>
  );
}
