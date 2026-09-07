"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function MovieBrowser({ movies }: { movies: Movie[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "genre" | "decade" | "surprise">("none");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeDecade, setActiveDecade] = useState<number | null>(null);
  const [surpriseGenre, setSurpriseGenre] = useState("any");
  const [surpriseDecade, setSurpriseDecade] = useState("any");
  const [surpriseMessage, setSurpriseMessage] = useState("");

  // Split each movie's "Action / Crime / Superhero" genre string into
  // individual genres, and collect the unique set across everything.
  const allGenres = Array.from(
    new Set(
      movies.flatMap((m) => (m.genre ? m.genre.split("/").map((g) => g.trim()) : []))
    )
  ).sort();

  const allDecades = Array.from(
    new Set(movies.filter((m) => m.year).map((m) => Math.floor((m.year as number) / 10) * 10))
  ).sort((a, b) => b - a);

  let filtered = movies;
  if (activeGenre) {
    filtered = movies.filter((m) => m.genre?.split("/").map((g) => g.trim()).includes(activeGenre));
  } else if (activeDecade !== null) {
    filtered = movies.filter((m) => m.year && Math.floor(m.year / 10) * 10 === activeDecade);
  }

  function reset() {
    setMode("none");
    setActiveGenre(null);
    setActiveDecade(null);
  }

  function handleSurprise() {
    let candidates = movies;
    if (surpriseGenre !== "any") {
      candidates = candidates.filter((m) =>
        m.genre?.split("/").map((g) => g.trim()).includes(surpriseGenre)
      );
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
    router.push(`/movie/${pick.slug}`);
  }

  return (
    <>
      <div className="filter-btn-row">
        <button
          className={`decade-btn ${mode === "genre" ? "active" : ""}`}
          onClick={() => setMode(mode === "genre" ? "none" : "genre")}
        >
          By Genre
        </button>
        <button
          className={`decade-btn ${mode === "decade" ? "active" : ""}`}
          onClick={() => setMode(mode === "decade" ? "none" : "decade")}
        >
          By Decade
        </button>
        <button
          className={`decade-btn surprise-btn`}
          onClick={() => {
            setMode(mode === "surprise" ? "none" : "surprise");
            setSurpriseMessage("");
          }}
        >
          🎲 Surprise Me
        </button>
      </div>

      {mode === "surprise" && (
        <div className="surprise-filters">
          <div className="surprise-field">
            <label>Genre</label>
            <select value={surpriseGenre} onChange={(e) => setSurpriseGenre(e.target.value)}>
              <option value="any">Any genre</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="surprise-field">
            <label>Decade</label>
            <select value={surpriseDecade} onChange={(e) => setSurpriseDecade(e.target.value)}>
              <option value="any">Any decade</option>
              {allDecades.map((d) => (
                <option key={d} value={d}>{d}s</option>
              ))}
            </select>
          </div>
          <button className="surprise-go-btn" onClick={handleSurprise}>
            Take Me There
          </button>
          {surpriseMessage && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{surpriseMessage}</p>}
        </div>
      )}

      {mode === "genre" && !activeGenre && (
        <div className="decade-grid">
          {allGenres.map((g) => (
            <div key={g} className="decade-pill" onClick={() => setActiveGenre(g)}>
              {g}
            </div>
          ))}
        </div>
      )}

      {mode === "decade" && activeDecade === null && (
        <div className="decade-grid">
          {allDecades.map((d) => (
            <div key={d} className="decade-pill" onClick={() => setActiveDecade(d)}>
              {d}s
            </div>
          ))}
        </div>
      )}

      <div className="movie-list">
        {(activeGenre || activeDecade !== null) && (
          <span className="decade-back" onClick={reset}>
            ← Back to all movies
          </span>
        )}

        {!activeGenre && activeDecade === null && <h1>All Movies</h1>}
        {activeGenre && <h1>{activeGenre}</h1>}
        {activeDecade !== null && <h1>{activeDecade}s</h1>}

        {filtered.length === 0 && <p>No movies here yet.</p>}

        {filtered.map((movie) => (
          <Link key={movie.id} href={`/movie/${movie.slug}`} className="movie-row">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt="" className="movie-row-poster" />
            ) : (
              <div className="movie-row-poster" />
            )}
            <div className="movie-row-info">
              {movie.title} {movie.year ? `(${movie.year})` : ""}
            </div>
            <span className="avg-score">
              {movie.avg} {movie.count > 0 && `(${movie.count})`}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
