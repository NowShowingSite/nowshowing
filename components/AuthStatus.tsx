"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import WatchlistModal from "@/components/WatchlistModal";

export default function AuthStatus() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = "still checking"
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check who's logged in right now.
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", data.user.id)
          .single();
        setIsAdmin(profile?.is_admin ?? false);
      }
    });

    // Keep this in sync if the user logs in/out in another tab, or
    // right after submitting the login form. This is what was missing
    // before -- it used to only update the email, not admin status, so
    // logging in on a page where the header was already mounted (e.g.
    // navigating from /login to /) could leave "Add Movie/TV" hidden
    // until a manual refresh re-ran the initial admin check.
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user?.email ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();
        setIsAdmin(profile?.is_admin ?? false);
      } else {
        setIsAdmin(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (email === undefined) {
    // Still checking -- avoids a flash of "Login" before we know.
    return null;
  }

  if (email) {
    return (
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <WatchlistModal />
        {isAdmin && (
          <Link href="/add-movie" className="login-link">
            Add Movie/TV
          </Link>
        )}
        <span
          style={{
            color: "var(--text)",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.7rem",
            letterSpacing: "0.03em",
          }}
        >
          Logged in as {email}
        </span>
        <button onClick={handleLogout} className="login-link" style={{ cursor: "pointer" }}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <Link href="/login" className="login-link">
      Login
    </Link>
  );
}
