import { createClient } from "@/lib/supabaseClient";
import RatingForm from "@/components/RatingForm";

// Same fix as the home page -- always check the database fresh,
// never serve a stale snapshot from build time.
export const dynamic = "force-dynamic";

async function getMovie(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("movies")
    .select("id, title, year, genre, director, runtime, ratings(score, profiles(username))")
    .eq("slug", slug)
    .single();
  return data;
}

export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const movie = await getMovie(params.slug);

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
}          <li key={i}>
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
