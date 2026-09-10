"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { addGuestRecent } from "@/lib/guestRecents";

type MovieOption = { id: string; slug: string; title: string; year: number | null; poster_url: string | null };

// The home page already fetches the full movie list server-side --
// this used to independently re-fetch that exact same list client-
// side on every page load, which was a wasted duplicate round-trip.
// Receiving it as a prop instead reuses what's already there.
export default function SearchBar({ movies }: { movies: MovieOption[] }) {
  const supabase = createClient();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

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
    ? movies.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 8)
    : [];

  async function goToMovie(movie: MovieOption) {
    setQuery("");
    setOpen(false);

    // Record this as a recent search. Logged in -> saved to your
    // account (upsert so re-searching just bumps it to the top).
    // Logged out -> kept in this browser session only.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("recent_searches")
        .upsert(
          { user_id: user.id, movie_id: movie.id, searched_at: new Date().toISOString() },
          { onConflict: "user_id,movie_id" }
        );
    } else {
      addGuestRecent(movie.id);
    }

    router.push(`/movie/${movie.slug}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      goToMovie(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
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
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {open && q && (
          <div className="dropdown">
            {results.length === 0 && <div className="dropdown-empty">No matches found.</div>}
            {results.map((m, i) => (
              <div
                key={m.slug}
                className={`dropdown-item${i === highlighted ? " active" : ""}`}
                onClick={() => goToMovie(m)}
                onMouseEnter={() => setHighlighted(i)}
              >
                <div className="d-thumb">
                  {m.poster_url && <Image src={m.poster_url} alt="" width={32} height={44} />}
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
