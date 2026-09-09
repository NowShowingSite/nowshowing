"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import WatchlistModal from "@/components/WatchlistModal";

export default function AuthStatus() {
  const supabase = createClient();
  const router = useRouter();
  const { loading, email, isAdmin } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
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
