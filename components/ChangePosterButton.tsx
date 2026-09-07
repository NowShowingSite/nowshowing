"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type Poster = { url: string; language: string | null };

export default function ChangePosterButton({
  movieId,
  tmdbId,
  mediaType,
}: {
  movieId: string;
  tmdbId: number | null;
  mediaType: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [posters, setPosters] = useState<Poster[] | null>(null); // null = loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.is_admin ?? false);
    })();
  }, []);

  async function handleOpen() {
    setOpen(true);
    setPosters(null);
    const res = await fetch(`/api/tmdb-posters?id=${tmdbId}&type=${mediaType}`);
    const data = await res.json();
    setPosters(data.posters ?? []);
  }

  async function handlePick(url: string) {
    setSaving(true);
    await supabase.from("movies").update({ poster_url: url }).eq("id", movieId);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  // Only admins get this button, and only for movies TMDB actually
  // knows about (need a tmdb_id to look up poster options).
  if (!isAdmin || !tmdbId) return null;

  return (
    <>
      <button className="change-poster-btn" onClick={handleOpen}>
        Change Poster
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Close" onClick={() => setOpen(false)}>
              &times;
            </button>
            <h2 className="modal-title">Change Poster</h2>
            <p className="modal-subtitle">Pick a replacement from TMDB</p>

            {posters === null && <div className="modal-empty">Loading...</div>}
            {posters && posters.length === 0 && (
              <div className="modal-empty">No alternate posters found.</div>
            )}
            {posters && posters.length > 0 && (
              <div className="poster-pick-grid">
                {posters.map((p, i) => (
                  <img
                    key={i}
                    src={p.url}
                    alt=""
                    className="poster-pick-thumb"
                    style={{ opacity: saving ? 0.5 : 1, pointerEvents: saving ? "none" : "auto" }}
                    onClick={() => handlePick(p.url)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
