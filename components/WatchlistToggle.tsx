"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

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
  const { loading: authLoading, userId } = useAuth();
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || !tmdbId || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", userId)
        .eq("tmdb_id", tmdbId)
        .maybeSingle();

      setOnWatchlist(!!data);
      setChecked(true);
    })();
  }, [tmdbId, userId, authLoading]);

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
  if (authLoading || !userId || !tmdbId || !checked) return null;

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
