"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  avg: string; // "—" if unrated, else a formatted number string
  count: number;
  media_type: string;
};

// Red at 0, green at 10, yellow in between.
function ratingColor(avgText: string) {
  const n = parseFloat(avgText);
  if (isNaN(n)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, n));
  return `hsl(${(clamped / 10) * 120}, 70%, 50%)`;
}

export default function CountLink({
  movies,
  mediaType,
  count,
}: {
  movies: Item[];
  mediaType: "movie" | "tv";
  count: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const filtered = movies
    .filter((m) => (mediaType === "tv" ? m.media_type === "tv" : m.media_type !== "tv"))
    .sort((a, b) => {
      const ra = a.count > 0 ? parseFloat(a.avg) : null;
      const rb = b.count > 0 ? parseFloat(b.avg) : null;
      if (ra !== null && rb !== null) return rb - ra;
      if (ra !== null) return -1;
      if (rb !== null) return 1;
      return a.title.localeCompare(b.title);
    });

  function goToMovie(slug: string) {
    setOpen(false);
    router.push(`/movie/${slug}`);
  }

  return (
    <>
      <span className="count-num" onClick={() => setOpen(true)}>
        {count}
      </span>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setOpen(false)}>
              &times;
            </button>
            <h2 className="modal-title">{mediaType === "tv" ? "All TV Shows" : "All Movies"}</h2>
            <p className="modal-subtitle">
              {filtered.length} title{filtered.length === 1 ? "" : "s"}
            </p>

            {filtered.length === 0 && <div className="modal-empty">Nothing here yet.</div>}
            {filtered.length > 0 && (
              <div className="modal-movie-list">
                {filtered.map((m) => (
                  <div key={m.id} className="modal-movie-item" onClick={() => goToMovie(m.slug)}>
                    <span className="modal-movie-title">{m.title}</span>
                    <span className="modal-movie-meta">
                      <span>{m.year ?? ""}</span>
                      <span style={{ color: ratingColor(m.avg) }}>{m.count > 0 ? m.avg : "—"}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
