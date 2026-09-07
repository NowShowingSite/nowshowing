"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

// TMDB gives dates like "2026-11-13" with no time attached. Parsing
// that directly with `new Date(...)` treats it as UTC midnight, which
// then shifts a day earlier once displayed in most US/western
// timezones. Parsing the year/month/day as local values avoids that.
function formatReleaseDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WatchlistPage() {
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  async function loadWatchlist(userId: string) {
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("release_date", { ascending: true, nullsFirst: false });
    setItems(data ?? []);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      setCheckingAuth(false);
      if (data.user) loadWatchlist(data.user.id);
    });
  }, []);

  async function handleRemove(id: string) {
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (checkingAuth) return null;

  if (!loggedIn) {
    return (
      <div className="movie-list">
        <Link href="/" className="back-link">
          ← Back to search
        </Link>
        <p>You need to log in to see your watchlist.</p>
      </div>
    );
  }

  return (
    <div className="movie-list">
      <Link href="/" className="back-link">
        ← Back to search
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>My Watchlist</h1>
        <Link href="/watchlist/add" className="login-link">
          + Add
        </Link>
      </div>

      {items.length === 0 && <p>Nothing on your watchlist yet.</p>}

      {items.map((item) => (
        <div key={item.id} className="movie-row" style={{ cursor: "default" }}>
          {item.poster_url ? (
            <img src={item.poster_url} alt="" className="movie-row-poster" />
          ) : (
            <div className="movie-row-poster" />
          )}
          <div className="movie-row-info">
            {item.title} {item.year ? `(${item.year})` : ""}
            {item.release_date && (
              <div style={{ fontSize: "0.75rem", opacity: 0.6, fontFamily: "'Space Mono', monospace" }}>
                {formatReleaseDate(item.release_date)}
              </div>
            )}
          </div>
          <button
            onClick={() => handleRemove(item.id)}
            className="login-link"
            style={{ cursor: "pointer" }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
