"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Red at 0, green at 10, yellow in between.
function ratingColor(score: number | null) {
  if (score === null || isNaN(score)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, score));
  return `hsl(${(clamped / 10) * 120}, 70%, 50%)`;
}

export default function RatingForm({
  movieId,
  tmdbId,
  avg,
}: {
  movieId: string;
  tmdbId?: number | null;
  avg: number | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const hasRating = avg !== null;
  const avgText = hasRating ? avg!.toFixed(1) : "N/A";
  const badgeColor = hasRating ? ratingColor(avg) : "var(--text-muted)";

  async function handleClick() {
    if (submitting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You need to log in first.");
      return;
    }

    const input = window.prompt("Your rating (0-10):");
    if (input === null) return; // cancelled

    const score = parseFloat(input);
    if (isNaN(score) || score < 0 || score > 10) {
      alert("Enter a number between 0 and 10.");
      return;
    }

    setSubmitting(true);

    // "upsert" means: insert a new rating, or update it if this user
    // already rated this movie (matches the unique constraint in the DB).
    const { error } = await supabase
      .from("ratings")
      .upsert(
        { user_id: user.id, movie_id: movieId, score },
        { onConflict: "user_id,movie_id" }
      );

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    // If this movie was on your watchlist, rating it means you've now
    // watched it -- so clear it off automatically.
    if (tmdbId) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("tmdb_id", tmdbId);
    }

    setSubmitting(false);
    // The page's rating data is fetched server-side and won't know
    // about this new rating on its own -- this re-runs that fetch.
    router.refresh();
  }

  return (
    <div className="rating-row">
      <div
        className="rating-badge rating-badge-clickable"
        style={{ borderColor: badgeColor, opacity: submitting ? 0.5 : 1 }}
        onClick={handleClick}
      >
        <span className="num" style={{ color: badgeColor }}>{avgText}</span>
        <span className={`out${hasRating ? "" : " out-small"}`}>
          {hasRating ? "OUT OF 10" : (
            <>NOT YET<br />RATED</>
          )}
        </span>
      </div>
      {hasRating && avg === 10 && (
        <div className="perfect-score">Perfect<br />Score</div>
      )}
    </div>
  );
}
