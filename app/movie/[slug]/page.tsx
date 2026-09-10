import { createClient } from "@/lib/supabaseClient";
import Image from "next/image";
import RatingForm from "@/components/RatingForm";
import DirectorLink from "@/components/DirectorLink";
import WatchlistToggle from "@/components/WatchlistToggle";
import ChangePosterButton from "@/components/ChangePosterButton";
import CollectionsButton from "@/components/CollectionsButton";
import BackLink from "@/components/BackLink";
import ClickOutsideBack from "@/components/ClickOutsideBack";

// Same fix as the home page -- always check the database fresh,
// never serve a stale snapshot from build time.
export const dynamic = "force-dynamic";

// Runtime is stored in minutes -- format as "1h 40m" instead of "100m".
function formatRuntime(minutes: number | null) {
  if (typeof minutes !== "number") return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// TV shows show a year range: "2016–2019", or "2016–present" if still airing.
function formatYearDisplay(movie: { year: number | null; year_end: number | null; media_type: string }) {
  if (movie.media_type !== "tv") return movie.year;
  if (!movie.year) return "";
  return `${movie.year}–${movie.year_end ?? "present"}`;
}

// Long titles (like Dr. Strangelove's full subtitle) would otherwise
// wrap across many lines at the default size, blowing out the card's
// height. Scale the font down in tiers so anything long still fits in
// roughly the same 2-line footprint as a normal title.
function getTitleFontSize(title: string): string | undefined {
  const len = title.length;
  if (len <= 25) return undefined; // use the default clamp() from CSS
  if (len <= 40) return "clamp(1.6rem, 4vw, 2.4rem)";
  if (len <= 60) return "clamp(1.3rem, 3.2vw, 1.9rem)";
  return "clamp(1.1rem, 2.6vw, 1.5rem)";
}

async function getMovie(slug: string) {
  const supabase = createClient();

  // These two don't depend on each other at all -- fetching them one
  // after another was wasting a full round-trip of latency for no
  // reason. Running them at the same time gets both back in roughly
  // the time of the slower one, instead of the sum of both.
  const [movieResult, adminsResult] = await Promise.all([
    supabase
      .from("movies")
      .select("id, title, year, year_end, genre, director, creator, runtime, poster_url, tmdb_id, collections, trailer_url, media_type")
      .eq("slug", slug)
      .single(),
    // The site's "official" score is the average of just the admin
    // accounts (Adam/Alex/Rob) -- everyone else's ratings are tracked
    // separately and shown elsewhere. Ordered by an explicit sort_order
    // (set manually per account) so it's always Adam, Alex, Rob no
    // matter who actually signed up first -- falls back to signup
    // order for any admin account that doesn't have one set yet.
    supabase
      .from("profiles")
      .select("id, username")
      .eq("is_admin", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  const { data: movie, error } = movieResult;
  const { data: admins } = adminsResult;

  if (error || !movie) {
    return { movie: null, error: error?.message ?? null, avg: null, adminBreakdown: [], userAvg: null };
  }

  const adminIds = (admins ?? []).map((a) => a.id);
  const adminIdSet = new Set(adminIds);

  // One query gets everything needed for both the admin breakdown AND
  // the non-admin average -- no need for two separate fetches.
  const { data: allRatings } = await supabase
    .from("ratings")
    .select("user_id, score")
    .eq("movie_id", movie.id);

  const scoreByAdmin: Record<string, number> = {};
  const nonAdminScores: number[] = [];
  (allRatings ?? []).forEach((r) => {
    if (adminIdSet.has(r.user_id)) {
      scoreByAdmin[r.user_id] = r.score;
    } else {
      nonAdminScores.push(r.score);
    }
  });

  const adminBreakdown = (admins ?? []).map((a) => ({
    username: a.username,
    score: scoreByAdmin[a.id] ?? null,
  }));

  const ratedScores = adminBreakdown.filter((a) => a.score !== null).map((a) => a.score as number);
  const avg = ratedScores.length > 0 ? ratedScores.reduce((sum, s) => sum + s, 0) / ratedScores.length : null;

  // Only relevant to admins viewing the page -- everyone else instead
  // sees their own personal score in that same slot (handled client-
  // side in RatingForm, since it depends on who's actually looking).
  const userAvg =
    nonAdminScores.length > 0
      ? nonAdminScores.reduce((sum, s) => sum + s, 0) / nonAdminScores.length
      : null;

  return { movie, error: null, avg, adminBreakdown, userAvg };
}

export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { movie, error, avg, adminBreakdown, userAvg } = await getMovie(params.slug);

  if (error) {
    return (
      <ClickOutsideBack>
        <div className="detail-wrap">
          <BackLink />
        </div>
      </ClickOutsideBack>
    );
  }
  if (!movie) {
    return (
      <ClickOutsideBack>
        <div className="detail-wrap">
          <BackLink />
        </div>
      </ClickOutsideBack>
    );
  }

  return (
    <ClickOutsideBack>
      <div className="detail-wrap">
        <BackLink />
      <div className="ticket">
        <WatchlistToggle
          tmdbId={movie.tmdb_id}
          title={movie.title}
          year={movie.year}
          genre={movie.genre}
          director={movie.director}
          posterUrl={movie.poster_url}
        />
        {movie.collections && movie.collections.length > 0 && (
          <CollectionsButton collections={movie.collections} currentSlug={params.slug} />
        )}
        <div className="ticket-layout">
          <div className="poster-col">
            <div className="ticket-poster">
              {movie.poster_url ? (
                <Image src={movie.poster_url} alt="" fill sizes="180px" style={{ objectFit: "contain" }} />
              ) : (
                "No poster yet"
              )}
            </div>
            {movie.trailer_url && (
              <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="trailer-btn">
                ▶ Trailer
              </a>
            )}
            <ChangePosterButton movieId={movie.id} tmdbId={movie.tmdb_id} mediaType={movie.media_type} />
          </div>
          <div className="ticket-info">
            {/* Clickable rating badge -- click it to see the Adam/Alex/Rob
                breakdown, or use the small link below to submit your own
                score. This is a client component since it needs to know
                who's logged in. */}
            <RatingForm movieId={movie.id} tmdbId={movie.tmdb_id} avg={avg} adminBreakdown={adminBreakdown} userAvg={userAvg} />

            <h1 className="detail-title" style={{ fontSize: getTitleFontSize(movie.title) }}>
              {movie.title}
            </h1>
            <div className="meta-line">
              <span className="meta-year">{formatYearDisplay(movie)}</span>
              <span>{movie.genre}</span>
              {movie.media_type === "movie" && movie.runtime && (
                <span className="meta-runtime">{formatRuntime(movie.runtime)}</span>
              )}
            </div>
            <div className="meta-director">
              {movie.media_type === "tv" ? "Creator" : "Director"}:{" "}
              {(movie.media_type === "tv" ? movie.creator : movie.director) ? (
                <DirectorLink
                  name={movie.media_type === "tv" ? movie.creator : movie.director}
                  currentSlug={params.slug}
                />
              ) : (
                "Unknown"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ClickOutsideBack>
  );
}
