"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useAuth } from "@/lib/AuthContext";

// Red at 0, green at 10, yellow in between.
function ratingColor(score: number | null) {
  if (score === null || isNaN(score)) return "var(--text-muted)";
  const clamped = Math.max(0, Math.min(10, score));
  return `hsl(${(clamped / 10) * 120}, 70%, 50%)`;
}

// Keeps up to 2 decimal places, but trims trailing zeros -- 9.50
// shows as "9.5", 10.00 shows as "10", but 9.25 stays exactly 9.25.
function formatRating(n: number) {
  return parseFloat(n.toFixed(2)).toString();
}

type AdminScore = { username: string; score: number | null };

export default function RatingForm({
  movieId,
  tmdbId,
  avg,
  adminBreakdown,
  userAvg,
}: {
  movieId: string;
  tmdbId?: number | null;
  avg: number | null;
  adminBreakdown: AdminScore[];
  userAvg: number | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { loading: authLoading, userId, isAdmin } = useAuth();

  const [expanded, setExpanded] = useState(false);

  const [rateOpen, setRateOpen] = useState(false);
  useBodyScrollLock(rateOpen);
  const [scoreInput, setScoreInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // "Your Score" -- only relevant for non-admins, since admins already
  // appear in the Adam/Alex/Rob row above.
  const [myScore, setMyScore] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !userId || isAdmin) return; // admins already shown above
    (async () => {
      const { data: rating } = await supabase
        .from("ratings")
        .select("score")
        .eq("user_id", userId)
        .eq("movie_id", movieId)
        .maybeSingle();
      setMyScore(rating?.score ?? null);
    })();
  }, [movieId, userId, isAdmin, authLoading]);

  const hasRating = avg !== null;
  const avgText = hasRating ? formatRating(avg!) : "N/A";
  const badgeColor = hasRating ? ratingColor(avg) : "var(--text-muted)";
  const needsLogin = !authLoading && !userId;

  function handleOpenRate() {
    setError("");
    setScoreInput(myScore !== null ? formatRating(myScore) : "");
    setRateOpen(true);
  }

  async function handleSubmit() {
    if (!userId) return;

    const score = parseFloat(scoreInput);
    if (isNaN(score) || score < 0 || score > 10) {
      setError("Enter a number between 0 and 10.");
      return;
    }

    setSubmitting(true);

    // "upsert" means: insert a new rating, or update it if this user
    // already rated this movie (matches the unique constraint in the DB).
    const { error: upsertError } = await supabase
      .from("ratings")
      .upsert(
        { user_id: userId, movie_id: movieId, score },
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
      await supabase.from("watchlist").delete().eq("user_id", userId).eq("tmdb_id", tmdbId);
    }

    setSubmitting(false);
    setRateOpen(false);
    setMyScore(score);
    // The page's rating data is fetched server-side and won't know
    // about this new rating on its own -- this re-runs that fetch
    // (mainly matters if you're an admin, updating the official row).
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

        {expanded &&
          adminBreakdown.map((a) => {
            const color = a.score !== null ? ratingColor(a.score) : "var(--text-muted)";
            return (
              <div key={a.username} className="inline-score-item">
                <div className="inline-score-badge" style={{ borderColor: color, color }}>
                  {a.score !== null ? formatRating(a.score) : "N/A"}
                </div>
                <span className="inline-score-name">{a.username}</span>
              </div>
            );
          })}

        {expanded && isAdmin && userAvg !== null && (
          <div className="inline-score-item">
            <div
              className="inline-score-badge"
              style={{ borderColor: ratingColor(userAvg), color: ratingColor(userAvg) }}
            >
              {formatRating(userAvg)}
            </div>
            <span className="inline-score-name">Users</span>
          </div>
        )}

        {expanded && !isAdmin && myScore !== null && (
          <div className="inline-score-item">
            <div
              className="inline-score-badge"
              style={{ borderColor: ratingColor(myScore), color: ratingColor(myScore) }}
            >
              {formatRating(myScore)}
            </div>
            <span className="inline-score-name">User</span>
          </div>
        )}

        {hasRating && avg === 10 && (
          <div className="perfect-score">Perfect<br />Score</div>
        )}
      </div>

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
                    step="0.01"
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
