"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type MovieOption = { id: string; slug: string; title: string; year: number | null; poster_url: string | null };

export default function SearchBar() {
  const supabase = createClient();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [allMovies, setAllMovies] = useState<MovieOption[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Load the movie list once -- the dataset is small enough that
  // filtering it in the browser as you type is instant, same as the
  // original static site did.
  useEffect(() => {
    supabase
      .from("movies")
      .select("id, slug, title, year, poster_url")
      .then(({ data }) => setAllMovies(data ?? []));
  }, []);

  // Close the dropdown if you click outside it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? allMovies.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 8)
    : [];

  async function goToMovie(movie: MovieOption) {
    setQuery("");
    setOpen(false);

    // Record this as a recent search, if logged in -- "upsert" so
    // re-searching the same movie just bumps it to the top instead of
    // creating a duplicate entry.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("recent_searches")
        .upsert(
          { user_id: user.id, movie_id: movie.id, searched_at: new Date().toISOString() },
          { onConflict: "user_id,movie_id" }
        );
    }

    router.push(`/movie/${movie.slug}`);
  }

  return (
    <div className="search-section" ref={boxRef}>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search a movie..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {open && q && (
          <div className="dropdown">
            {results.length === 0 && <div className="dropdown-empty">No matches found.</div>}
            {results.map((m) => (
              <div key={m.slug} className="dropdown-item" onClick={() => goToMovie(m)}>
                <div className="d-thumb">
                  {m.poster_url && <img src={m.poster_url} alt="" />}
                </div>
                <div className="d-info">
                  <span className="d-title">{m.title}</span>
                  <span className="d-year">{m.year ?? ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
