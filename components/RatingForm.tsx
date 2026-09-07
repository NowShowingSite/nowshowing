"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function RatingForm({
  movieId,
  tmdbId,
}: {
  movieId: string;
  tmdbId?: number | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [score, setScore] = useState("");
  const [status, setStatus] = useState("");

  async function submitRating() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You need to log in first.");
      return;
    }

    // "upsert" means: insert a new rating, or update it if this user
    // already rated this movie (matches the unique constraint in the DB).
    const { error } = await supabase
      .from("ratings")
      .upsert(
        { user_id: user.id, movie_id: movieId, score: parseFloat(score) },
        { onConflict: "user_id,movie_id" }
      );

    if (error) {
      setStatus(error.message);
      return;
    }

    // If this movie was on your watchlist, rating it means you've now
    // watched it -- so clear it off automatically.
    if (tmdbId) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId);
    }

    setStatus("Rating saved!");
    // The movie page's rating list is fetched server-side and won't
    // know about this new rating on its own -- this tells Next.js to
    // re-run that fetch and show the updated list without a full reload.
    router.refresh();
  }

  return (
    <div className="rating-form">
      <input
        type="number"
        min="0"
        max="10"
        step="0.1"
        placeholder="0-10"
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />
      <button onClick={submitRating}>Submit Rating</button>
      {status && <span>{status}</span>}
    </div>
  );
}
