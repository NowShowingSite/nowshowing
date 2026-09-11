"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import DirectorLink from "@/components/DirectorLink";

type UpcomingItem = {
  id: string;
  title: string;
  year: number | null;
  genre: string | null;
  director: string | null;
  posterUrl: string | null;
  releaseDateStr: string;
  slug: string | null; // null if this movie isn't in the shared catalog yet
};

const PAGE_SIZE = 3;

function formatReleaseDate(dateStr: string) {
  // TMDB gives dates like "2026-11-13" with no time attached. Parsing
  // that directly with `new Date(...)` treats it as UTC midnight,
  // which then shifts a day earlier once displayed in most US/western
  // timezones. Parsing the year/month/day as local values avoids that.
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UpcomingReleases() {
  const supabase = createClient();
  const router = useRouter();
  const { loading: authLoading, userId } = useAuth();
  const [items, setItems] = useState<UpcomingItem[] | null>(null); // null = "not logged in / not loaded"
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<UpcomingItem | null>(null);
  useBodyScrollLock(preview !== null);

  async function loadUpcoming() {
    if (!userId) {
      setItems([]);
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const { data: watchlistItems } = await supabase
      .from("watchlist")
      .select("id, title, year, genre, director, poster_url, release_date, tmdb_id")
      .eq("user_id", userId)
      .not("release_date", "is", null)
      .gt("release_date", todayStr)
      .order("release_date", { ascending: true });

    if (!watchlistItems || watchlistItems.length === 0) {
      setItems([]);
      return;
    }

    // Some of these might already be in the shared movies catalog
    // (an admin added them) -- if so, link to that movie's page.
    const tmdbIds = watchlistItems.map((w) => w.tmdb_id);
    const { data: movies } = await supabase
      .from("movies")
      .select("slug, tmdb_id")
      .in("tmdb_id", tmdbIds);
    const slugByTmdbId = Object.fromEntries((movies ?? []).map((m) => [m.tmdb_id, m.slug]));

    setItems(
      watchlistItems.map((w) => ({
        id: w.id,
        title: w.title,
        year: w.year,
        genre: w.genre,
        director: w.director,
        posterUrl: w.poster_url,
        releaseDateStr: w.release_date,
        slug: slugByTmdbId[w.tmdb_id] ?? null,
      }))
    );
  }

  // Re-runs whenever the shared auth state changes (login/logout) --
  // this used to independently listen for that itself; now it just
  // reacts to the one shared check instead.
  useEffect(() => {
    if (authLoading) return;
    setPage(0);
    loadUpcoming();
  }, [userId, authLoading]);

  // Not logged in, or nothing upcoming -- don't show the widget at all.
  if (!items || items.length === 0) return null;

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = items.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="upcoming-wrap">
      <button
        className="upcoming-arrow upcoming-arrow-prev"
        disabled={currentPage <= 0}
        onClick={() => setPage((p) => p - 1)}
        aria-label="Previous"
      >
        ‹
      </button>

      <div className="upcoming-list">
        {pageItems.map((item) => (
          <p key={item.id} className="upcoming-strip">
            <a
              className="up-title"
              onClick={() => (item.slug ? router.push(`/movie/${item.slug}`) : setPreview(item))}
            >
              {item.title}
            </a>
            <span className="up-sep">—</span>
            <span className="up-date">{formatReleaseDate(item.releaseDateStr)}</span>
          </p>
        ))}
      </div>

      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 760, padding: 0, background: "none", border: "none", boxShadow: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setPreview(null)}
              style={{ top: 8, right: 8 }}
            >
              &times;
            </button>
            <div className="ticket">
              <div className="ticket-layout">
                <div className="poster-col">
                  <div className="ticket-poster">
                    {preview.posterUrl ? (
                      <Image src={preview.posterUrl} alt="" fill sizes="180px" style={{ objectFit: "contain" }} />
                    ) : (
                      "No poster yet"
                    )}
                  </div>
                </div>
                <div className="ticket-info">
                  <div className="rating-row">
                    <div className="rating-badge" style={{ borderColor: "var(--text-muted)" }}>
                      <span className="num" style={{ color: "var(--text-muted)" }}>N/A</span>
                      <span className="out out-small">
                        NOT YET<br />RATED
                      </span>
                    </div>
                  </div>

                  <h1 className="detail-title">{preview.title}</h1>
                  <div className="meta-line">
                    <span className="meta-year">{preview.year ?? ""}</span>
                    {preview.genre && <span>{preview.genre}</span>}
                  </div>
                  <div className="meta-director">
                    Director:{" "}
                    {preview.director ? (
                      <DirectorLink name={preview.director} currentSlug="" />
                    ) : (
                      "Unknown"
                    )}
                  </div>
                  <p
                    style={{
                      marginTop: 10,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.78rem",
                      color: "var(--text)",
                    }}
                  >
                    Releases {formatReleaseDate(preview.releaseDateStr)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="upcoming-arrow upcoming-arrow-next"
        disabled={currentPage >= pageCount - 1}
        onClick={() => setPage((p) => p + 1)}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
}
