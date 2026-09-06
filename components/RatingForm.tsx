"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function RatingForm({ movieId }: { movieId: string }) {
  const supabase = createClient();
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

    setStatus(error ? error.message : "Rating saved!");
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
