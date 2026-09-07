"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type Movie = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  avg: string;
  count: number;
  genre?: string | null;
};

// Red at 0, green at 10 -- matches the static site's rating color scale.
function ratingColor(avg: string) {
  const n = parseFloat(avg);
  if (isNaN(n)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, n));
  const hue = (clamped / 10) * 120;
  return `hsl(${hue}, 70%, 50%)`;
}

type ModalView =
  | { kind: "genreList" }
  | { kind: "genreResults"; genre: string }
  | { kind: "decadeList" }
  | { kind: "decadeResults"; decade: number }
  | { kind: "surprise" };

export default function MovieBrowser({ movies }: { movies: Movie[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [recentMovies, setRecentMovies] = useState<Movie[] | null>(null); // null = still loading

  const [modal, setModal] = useState<ModalView | null>(null);
  const [surpriseGenre, setSurpriseGenre] = useState("any");
  const [surpriseDecade, setSurpriseDecade] = useState("any");
  const [surpriseMessage, setSurpriseMessage] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoggedIn(false);
        setRecentMovies([]);
        return;
      }
      setLoggedIn(true);

      const { data } = await supabase
        .from("recent_searches")
        .select("movie_id")
        .eq("user_id", user.id)
        .order("searched_at", { ascending: false })
        .limit(16);

      const movieById = Object.fromEntries(movies.map((m) => [m.id, m]));
      const ordered = (data ?? [])
        .map((r) => movieById[r.movie_id])
        .filter(Boolean) as Movie[];
      setRecentMovies(ordered);
    })();
  }, []);

  async function handleClearRecents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("recent_searches").delete().eq("user_id", user.id);
    setRecentMovies([]);
  }

  // Split each movie's "Action / Crime / Superhero" genre string into
  // individual genres, and collect the unique set across everything.
  const allGenres = Array.from(
    new Set(movies.flatMap((m) => (m.genre ? m.genre.split("/").map((g) => g.trim()) : [])))
  ).sort();

  const allDecades = Array.from(
    new Set(movies.filter((m) => m.year).map((m) => Math.floor((m.year as number) / 10) * 10))
  ).sort((a, b) => b - a);

  function sortByRatingDesc(list: Movie[]) {
    return [...list].sort((a, b) => {
      const av = parseFloat(a.avg);
      const bv = parseFloat(b.avg);
      return (isNaN(bv) ? -1 : bv) - (isNaN(av) ? -1 : av);
    });
  }

  function genreMatches(genre: string) {
    return sortByRatingDesc(
      movies.filter((m) => m.genre?.split("/").map((g) => g.trim()).includes(genre))
    );
  }

  function decadeMatches(decade: number) {
    return sortByRatingDesc(movies.filter((m) => m.year && Math.floor(m.year / 10) * 10 === decade));
  }

  function goToMovie(slug: string) {
    setModal(null);
    router.push(`/movie/${slug}`);
  }

  function handleSurprise() {
    let candidates = movies;
    if (surpriseGenre !== "any") {
      candidates = candidates.filter((m) => m.genre?.split("/").map((g) => g.trim()).includes(surpriseGenre));
    }
    if (surpriseDecade !== "any") {
      const decade = parseInt(surpriseDecade);
      candidates = candidates.filter((m) => m.year && Math.floor(m.year / 10) * 10 === decade);
    }
    if (candidates.length === 0) {
      setSurpriseMessage("No movies match those filters.");
      return;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    goToMovie(pick.slug);
  }

  function renderMovieList(list: Movie[], emptyText: string) {
    if (list.length === 0) return <div className="modal-empty">{emptyText}</div>;
    return (
      <div className="modal-movie-list">
        {list.map((m) => (
          <div key={m.id} className="modal-movie-item" onClick={() => goToMovie(m.slug)}>
            <span className="modal-movie-title">{m.title}</span>
            <span className="modal-movie-meta">
              <span>{m.year ?? ""}</span>
              <span style={{ color: ratingColor(m.avg) }}>{m.count > 0 ? m.avg : "—"}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  function renderModalContent() {
    if (!modal) return null;

    if (modal.kind === "genreList") {
      return (
        <>
          <h2 className="modal-title">By Genre</h2>
          <p className="modal-subtitle">Pick a genre to browse</p>
          <div className="decade-grid">
            {allGenres.map((g) => (
              <div key={g} className="decade-pill" onClick={() => setModal({ kind: "genreResults", genre: g })}>
                {g}
              </div>
            ))}
          </div>
        </>
      );
    }

    if (modal.kind === "genreResults") {
      const matches = genreMatches(modal.genre);
      return (
        <>
          <span className="decade-back" onClick={() => setModal({ kind: "genreList" })}>
            ← All genres
          </span>
          <h2 className="modal-title">{modal.genre}</h2>
          <p className="modal-subtitle">
            {matches.length} title{matches.length === 1 ? "" : "s"}
          </p>
          {renderMovieList(matches, `Nothing tagged ${modal.genre} on here yet.`)}
        </>
      );
    }

    if (modal.kind === "decadeList") {
      return (
        <>
          <h2 className="modal-title">By Decade</h2>
          <p className="modal-subtitle">Pick a decade to browse</p>
          <div className="decade-grid">
            {allDecades.map((d) => (
              <div key={d} className="decade-pill" onClick={() => setModal({ kind: "decadeResults", decade: d })}>
                {d}s
              </div>
            ))}
          </div>
        </>
      );
    }

    if (modal.kind === "decadeResults") {
      const matches = decadeMatches(modal.decade);
      return (
        <>
          <span className="decade-back" onClick={() => setModal({ kind: "decadeList" })}>
            ← All decades
          </span>
          <h2 className="modal-title">The {modal.decade}s</h2>
          <p className="modal-subtitle">
            {matches.length} title{matches.length === 1 ? "" : "s"}
          </p>
          {renderMovieList(matches, `Nothing from the ${modal.decade}s on here yet.`)}
        </>
      );
    }

    if (modal.kind === "surprise") {
      return (
        <>
          <h2 className="modal-title">Surprise Me</h2>
          <p className="modal-subtitle">Optionally narrow it down first</p>
          <div className="surprise-filters">
            <div className="surprise-field">
              <label>Decade</label>
              <select value={surpriseDecade} onChange={(e) => setSurpriseDecade(e.target.value)}>
                <option value="any">Any</option>
                {allDecades.map((d) => (
                  <option key={d} value={d}>{d}s</option>
                ))}
              </select>
            </div>
            <div className="surprise-field">
              <label>Genre</label>
              <select value={surpriseGenre} onChange={(e) => setSurpriseGenre(e.target.value)}>
                <option value="any">Any</option>
                {allGenres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <button className="surprise-go-btn" onClick={handleSurprise}>
              🎲 Pick For Me
            </button>
            {surpriseMessage && <div className="modal-empty" style={{ marginTop: 14 }}>{surpriseMessage}</div>}
          </div>
        </>
      );
    }

    return null;
  }

  return (
    <>
      <div className="filter-btn-row">
        <button className="decade-btn" onClick={() => setModal({ kind: "genreList" })}>
          By Genre
        </button>
        <button className="decade-btn" onClick={() => setModal({ kind: "decadeList" })}>
          By Decade
        </button>
        <button
          className="decade-btn surprise-btn"
          onClick={() => {
            setSurpriseMessage("");
            setModal({ kind: "surprise" });
          }}
        >
          🎲 Surprise Me
        </button>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setModal(null)}>
              &times;
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}

      <div className="browse">
        <div className="browse-header">
          <h2>Recently Searched</h2>
          {(recentMovies ?? []).length > 0 && (
            <button className="clear-recents-btn" onClick={handleClearRecents}>
              Clear
            </button>
          )}
        </div>

        {!loggedIn && <p>Log in and search for a movie to see it show up here.</p>}
        {loggedIn && (recentMovies ?? []).length === 0 && (
          <p>Nothing searched yet — try the search bar above.</p>
        )}

        <div className="stub-grid">
          {(recentMovies ?? []).map((movie) => (
            <Link key={movie.id} href={`/movie/${movie.slug}`} className="stub">
              <div className="stub-poster">
                {movie.poster_url && <img src={movie.poster_url} alt="" />}
              </div>
              <div className="stub-body">
                <p className="stub-title">{movie.title}</p>
                <span className="stub-meta">{movie.year ?? ""}</span>
              </div>
              {movie.count > 0 && (
                <span className="stub-rating" style={{ color: ratingColor(movie.avg) }}>
                  {movie.avg}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
