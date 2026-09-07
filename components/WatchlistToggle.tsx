"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function WatchlistToggle({
  tmdbId,
  title,
  year,
  genre,
  director,
  posterUrl,
}: {
  tmdbId: number | null;
  title: string;
  year: number | null;
  genre: string | null;
  director: string | null;
  posterUrl: string | null;
}) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tmdbId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .maybeSingle();

      setOnWatchlist(!!data);
      setReady(true);
    })();
  }, [tmdbId]);

  async function toggle() {
    if (!userId || !tmdbId) return;

    if (onWatchlist) {
      await supabase.from("watchlist").delete().eq("user_id", userId).eq("tmdb_id", tmdbId);
      setOnWatchlist(false);
    } else {
      await supabase.from("watchlist").insert({
        user_id: userId,
        tmdb_id: tmdbId,
        title,
        year,
        genre,
        director,
        poster_url: posterUrl,
      });
      setOnWatchlist(true);
    }
  }

  // No account signed in, or this movie predates tmdb_id tracking --
  // nothing sensible to toggle, so render nothing.
  if (!ready || !userId || !tmdbId) return null;

  return (
    <button
      className="watchlist-toggle-btn"
      onClick={toggle}
      aria-label={onWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {onWatchlist ? "✓" : "+"}
    </button>
  );
}
