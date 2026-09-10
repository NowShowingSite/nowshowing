"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

type UpcomingItem = {
  id: string;
  title: string;
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

  async function loadUpcoming() {
    if (!userId) {
      setItems([]);
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const { data: watchlistItems } = await supabase
      .from("watchlist")
      .select("id, title, release_date, tmdb_id")
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
            {item.slug ? (
              <a className="up-title" onClick={() => router.push(`/movie/${item.slug}`)}>
                {item.title}
              </a>
            ) : (
              <span className="up-title">{item.title}</span>
            )}
            <span className="up-sep">—</span>
            <span className="up-date">{formatReleaseDate(item.releaseDateStr)}</span>
          </p>
        ))}
      </div>

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
