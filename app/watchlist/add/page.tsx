"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function AddToWatchlistPage() {
  const supabase = createClient();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      setCheckingAuth(false);
    });
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
  }

  async function handlePick(tmdbId: number) {
    setSaving(true);
    setStatus("Fetching details...");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStatus("You need to log in first.");
      setSaving(false);
      return;
    }

    const detailsRes = await fetch(`/api/tmdb-details?id=${tmdbId}`);
    const details = await detailsRes.json();

    const { error } = await supabase.from("watchlist").insert({
      user_id: user.id,
      tmdb_id: tmdbId,
      title: details.title,
      year: details.year,
      genre: details.genre,
      director: details.director,
      poster_url: details.posterUrl,
      release_date: details.releaseDate,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus(`Added "${details.title}" to your watchlist!`);
      router.push("/watchlist");
    }
    setSaving(false);
  }

  if (checkingAuth) return null;

  if (!loggedIn) {
    return (
      <div className="movie-list">
        <p>You need to log in to add movies to your watchlist.</p>
      </div>
    );
  }

  return (
    <div className="movie-list">
      <h1>Add to Watchlist</h1>
      <div className="rating-form">
        <input
          type="text"
          placeholder="Search TMDB by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ flex: 1, width: "auto" }}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {status && <p>{status}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
        {results.map((r) => (
          <div
            key={r.tmdbId}
            className="movie-row"
            style={{ cursor: saving ? "default" : "pointer", opacity: saving ? 0.5 : 1 }}
            onClick={() => !saving && handlePick(r.tmdbId)}
          >
            <span>
              {r.title} {r.year ? `(${r.year})` : ""}
            </span>
            <span>Add →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
