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

type AdminScore = { username: string; score: number | null };

export default function RatingForm({
  movieId,
  tmdbId,
  avg,
  adminBreakdown,
}: {
  movieId: string;
  tmdbId?: number | null;
  avg: number | null;
  adminBreakdown: AdminScore[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);

  const [rateOpen, setRateOpen] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasRating = avg !== null;
  const avgText = hasRating ? avg!.toFixed(1) : "N/A";
  const badgeColor = hasRating ? ratingColor(avg) : "var(--text-muted)";

  async function handleOpenRate() {
    setError("");
    setScoreInput("");
    const { data: { user } } = await supabase.auth.getUser();
    setNeedsLogin(!user);
    setRateOpen(true);
  }

  async function handleSubmit() {
    const score = parseFloat(scoreInput);
    if (isNaN(score) || score < 0 || score > 10) {
      setError("Enter a number between 0 and 10.");
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNeedsLogin(true);
      setSubmitting(false);
      return;
    }

    // "upsert" means: insert a new rating, or update it if this user
    // already rated this movie (matches the unique constraint in the DB).
    const { error: upsertError } = await supabase
      .from("ratings")
      .upsert(
        { user_id: user.id, movie_id: movieId, score },
        { onConflict: "user_id,movie_id" }
      );

    if (upsertError) {
      setError(upsertError.message);
      setSubmitting(false);
      return;
    }

    // If this movie was on your watchlist, rating it means you've now
    // watched it -- so clear it off automatically.
    if (tmdbId) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("tmdb_id", tmdbId);
    }

    setSubmitting(false);
    setRateOpen(false);
    // The page's rating data is fetched server-side and won't know
    // about this new rating on its own -- this re-runs that fetch.
    router.refresh();
  }

  return (
    <div>
      <div className="rating-row">
        <div
          className="rating-badge rating-badge-clickable"
          style={{ borderColor: badgeColor }}
          onClick={() => setExpanded((e) => !e)}
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

      {expanded && (
        <div className="inline-breakdown">
          {adminBreakdown.map((a) => {
            const color = a.score !== null ? ratingColor(a.score) : "var(--text-muted)";
            return (
              <div key={a.username} className="inline-score-item">
                <div className="inline-score-badge" style={{ borderColor: color, color }}>
                  {a.score !== null ? a.score.toFixed(1) : "N/A"}
                </div>
                <span className="inline-score-name">{a.username}</span>
              </div>
            );
          })}
        </div>
      )}

      <span className="rate-your-score-link" onClick={handleOpenRate}>
        Rate this movie
      </span>

      {rateOpen && (
        <div className="modal-overlay" onClick={() => setRateOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setRateOpen(false)}>
              &times;
            </button>

            {needsLogin ? (
              <>
                <h2 className="modal-title">Log in to rate</h2>
                <p className="modal-subtitle">You need an account to submit a rating.</p>
                <a href="/login" className="surprise-go-btn" style={{ display: "block", textAlign: "center" }}>
                  Go to Login
                </a>
              </>
            ) : (
              <>
                <h2 className="modal-title">Rate this movie</h2>
                <p className="modal-subtitle">Pick a score from 0 to 10</p>
                <div className="surprise-field">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    autoFocus
                    placeholder="0-10"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={{
                      width: "100%",
                      background: "var(--surface-2)",
                      border: "1px solid var(--divider)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.9rem",
                      padding: "10px 12px",
                    }}
                  />
                </div>
                <button
                  className="surprise-go-btn"
                  style={{ marginTop: "14px" }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Submit Rating"}
                </button>
                {error && <div className="modal-empty" style={{ marginTop: "10px" }}>{error}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
