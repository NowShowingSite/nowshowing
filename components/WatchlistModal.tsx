"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type WatchlistItem = {
  id: string;
  title: string;
  year: number | null;
  tmdb_id: number;
  release_date: string | null;
  slug: string | null; // filled in if this title exists in the shared catalog
};

export default function WatchlistModal() {
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [items, setItems] = useState<WatchlistItem[] | null>(null); // null = loading
  const [search, setSearch] = useState("");

  async function loadWatchlist() {
    setItems(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoggedIn(false);
      setItems([]);
      return;
    }
    setLoggedIn(true);

    const { data: watchlistRows } = await supabase
      .from("watchlist")
      .select("id, title, year, tmdb_id, release_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const rows = watchlistRows ?? [];
    const tmdbIds = rows.map((r) => r.tmdb_id);

    let slugByTmdbId: Record<number, string> = {};
    if (tmdbIds.length > 0) {
      const { data: movies } = await supabase.from("movies").select("slug, tmdb_id").in("tmdb_id", tmdbIds);
      slugByTmdbId = Object.fromEntries((movies ?? []).map((m) => [m.tmdb_id, m.slug]));
    }

    setItems(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        year: r.year,
        tmdb_id: r.tmdb_id,
        release_date: r.release_date,
        slug: slugByTmdbId[r.tmdb_id] ?? null,
      }))
    );
  }

  function handleOpen() {
    setOpen(true);
    setSearch("");
    loadWatchlist();
  }

  async function handleRemove(id: string) {
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
  }

  function goToItem(item: WatchlistItem) {
    if (!item.slug) return; // not in the shared catalog yet -- nothing to open
    setOpen(false);
    router.push(`/movie/${item.slug}`);
  }

  function handleShuffle() {
    const now = new Date().toISOString().slice(0, 10);
    const pool = (items ?? []).filter(
      (i) => i.slug && (!i.release_date || i.release_date <= now)
    );
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    goToItem(pick);
  }

  const visible = (items ?? []).filter((i) =>
    search.trim() ? i.title.toLowerCase().includes(search.trim().toLowerCase()) : true
  );

  return (
    <>
      <button className="login-link" onClick={handleOpen}>
        Watchlist
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setOpen(false)}>
              &times;
            </button>

            <div className="modal-header-row">
              <div>
                <h2 className="modal-title">Watchlist</h2>
                <p className="modal-subtitle">
                  {items === null ? "Loading..." : `${items.length} title${items.length === 1 ? "" : "s"} to watch`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {items && items.length > 0 && (
                  <button className="shuffle-btn" title="Shuffle" aria-label="Shuffle" onClick={handleShuffle}>
                    🔀
                  </button>
                )}
                <Link
                  href="/watchlist/add"
                  className="shuffle-btn"
                  title="Add to watchlist"
                  aria-label="Add to watchlist"
                  onClick={() => setOpen(false)}
                >
                  <span className="plus-icon">+</span>
                </Link>
              </div>
            </div>

            {!loggedIn && items !== null && (
              <div className="modal-empty">Log in to see your watchlist.</div>
            )}

            {loggedIn && items && items.length > 0 && (
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search watchlist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}

            {loggedIn && items !== null && items.length === 0 && (
              <div className="modal-empty">Nothing on the watchlist yet.</div>
            )}
            {loggedIn && items !== null && items.length > 0 && visible.length === 0 && (
              <div className="modal-empty">No matches.</div>
            )}

            {visible.length > 0 && (
              <div className="modal-movie-list">
                {visible.map((item) => (
                  <div
                    key={item.id}
                    className="modal-movie-item"
                    style={{ cursor: item.slug ? "pointer" : "default" }}
                    onClick={() => goToItem(item)}
                  >
                    <span className="modal-movie-title">{item.title}</span>
                    <span className="modal-movie-meta">
                      <span>{item.year ?? ""}</span>
                      <span
                        className="watchlist-remove-btn"
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.id);
                        }}
                      >
                        &times;
                      </span>
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
