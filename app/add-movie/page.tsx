"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Turns a title into a URL-friendly slug, e.g. "The Batman" -> "the-batman".
function slugify(title: string, year: number | null) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return year ? `${base}-${year}` : base;
}

export default function AddMoviePage() {
  const supabase = createClient();
  const router = useRouter();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [collectionsInput, setCollectionsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  // Only admins should be able to use this page at all.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingAccess(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.is_admin ?? false);
      setCheckingAccess(false);
    })();
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

    const detailsRes = await fetch(`/api/tmdb-details?id=${tmdbId}`);
    const details = await detailsRes.json();

    const slug = slugify(details.title, details.year);

    // Turn "Dark Knight Trilogy, DC" into ["Dark Knight Trilogy", "DC"],
    // preserving the specific-to-broad order you typed them in.
    const collections = collectionsInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const { error } = await supabase.from("movies").insert({
      slug,
      title: details.title,
      year: details.year,
      genre: details.genre,
      director: details.director,
      runtime: details.runtime,
      poster_url: details.posterUrl,
      tmdb_id: tmdbId,
      collections: collections.length > 0 ? collections : null,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus(`Added "${details.title}"!`);
      router.push(`/movie/${slug}`);
    }
    setSaving(false);
  }

  if (checkingAccess) return null;

  if (!isAdmin) {
    return (
      <div className="movie-list">
        <p>You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="movie-list">
      <h1>Add a Movie</h1>
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

      <div style={{ marginTop: "12px" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", opacity: 0.75, display: "block", marginBottom: "6px" }}>
          Collections (optional, comma-separated, specific to broad — e.g. "Dark Knight Trilogy, DC")
        </label>
        <input
          type="text"
          placeholder="e.g. MCU"
          value={collectionsInput}
          onChange={(e) => setCollectionsInput(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid var(--divider)",
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "'Inter', sans-serif",
          }}
        />
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
