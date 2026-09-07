import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDirectorMovies(name: string) {
  const supabase = createClient();
  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, slug, title, year, poster_url")
    .eq("director", name)
    .order("year", { ascending: true });

  return { movies: movies ?? [], error: error?.message ?? null };
}

export default async function DirectorPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const { movies, error } = await getDirectorMovies(name);

  return (
    <div className="movie-list">
      <Link href="/" className="decade-back">
        ← Back to all movies
      </Link>
      <h1>{name}</h1>

      {error && <p style={{ color: "salmon" }}>Error loading movies: {error}</p>}
      {!error && movies.length === 0 && <p>No movies found for this director.</p>}

      {movies.map((movie) => (
        <Link key={movie.id} href={`/movie/${movie.slug}`} className="movie-row">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt="" className="movie-row-poster" />
          ) : (
            <div className="movie-row-poster" />
          )}
          <div className="movie-row-info">
            {movie.title} {movie.year ? `(${movie.year})` : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
