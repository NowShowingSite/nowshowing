"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type CollectionMovie = { id: string; slug: string; title: string; year: number | null; avg: number | null };

// Red at 0, green at 10, yellow in between.
function ratingColor(avg: number | null) {
  if (avg === null || isNaN(avg)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, avg));
  return `hsl(${(clamped / 10) * 120}, 70%, 50%)`;
}

// Keeps up to 2 decimal places, but trims trailing zeros -- 9.50
// shows as "9.5", 10.00 shows as "10", but 9.25 stays exactly 9.25.
function formatRating(n: number) {
  return parseFloat(n.toFixed(2)).toString();
}

export default function CollectionLink({
  name,
  currentSlug,
}: {
  name: string;
  currentSlug: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);
  const [movies, setMovies] = useState<CollectionMovie[] | null>(null); // null = loading

  async function handleOpen() {
    setOpen(true);
    setMovies(null);

    const { data: collectionMovies } = await supabase
      .from("movies")
      .select("id, slug, title, year")
      .contains("collections", [name])
      .order("year", { ascending: true });

    const list = collectionMovies ?? [];
    const ids = list.map((m) => m.id);

    let avgById: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: ratings } = await supabase.from("ratings").select("movie_id, score").in("movie_id", ids);
      const scoresById: Record<string, number[]> = {};
      (ratings ?? []).forEach((r) => {
        if (!scoresById[r.movie_id]) scoresById[r.movie_id] = [];
        scoresById[r.movie_id].push(r.score);
      });
      avgById = Object.fromEntries(
        Object.entries(scoresById).map(([id, scores]) => [
          id,
          scores.reduce((a, b) => a + b, 0) / scores.length,
        ])
      );
    }

    setMovies(list.map((m) => ({ ...m, avg: avgById[m.id] ?? null })));
  }

  function goToMovie(slug: string) {
    setOpen(false);
    router.push(`/movie/${slug}`);
  }

  return (
    <>
      <span className="collection-badge" onClick={handleOpen}>
        {name}
      </span>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setOpen(false)}>
              &times;
            </button>
            <h2 className="modal-title">{name}</h2>
            <p className="modal-subtitle">Movies in this collection</p>

            {movies === null && <div className="modal-empty">Loading...</div>}
            {movies && movies.length === 0 && <div className="modal-empty">No other movies found.</div>}
            {movies && movies.length > 0 && (
              <div className="modal-movie-list">
                {movies.map((m) => {
                  const isCurrent = m.slug === currentSlug;
                  return (
                    <div
                      key={m.id}
                      className="modal-movie-item"
                      style={isCurrent ? { borderColor: "var(--gold-dim)" } : undefined}
                      onClick={() => goToMovie(m.slug)}
                    >
                      <span className="modal-movie-title">
                        {m.title}
                        {isCurrent && (
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (this one)</span>
                        )}
                      </span>
                      <span className="modal-movie-meta">
                        <span>{m.year ?? ""}</span>
                        <span style={{ color: ratingColor(m.avg) }}>
                          {m.avg !== null ? formatRating(m.avg) : "—"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
