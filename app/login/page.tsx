"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { getGuestRecents, clearGuestRecents } from "@/lib/guestRecents";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    // Make sure a matching row exists in "profiles" -- this is what
    // ratings are linked to. Without this, submitting a rating fails
    // because there's nothing for it to attach to.
    const user = data.user;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      // Default username from the email (e.g. "adam" from "adam@x.com").
      // They can change this later once a proper profile page exists.
      const defaultUsername = user.email!.split("@")[0];
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, username: defaultUsername });

      // Usernames must be unique -- if someone else already has this
      // one (e.g. two people both named "adam"), fall back to the
      // full email address so login still succeeds.
      if (insertError) {
        await supabase.from("profiles").insert({ id: user.id, username: user.email });
      }
    }

    // If you searched for anything while logged out, fold those into
    // your account's Recently Searched now -- they take the top spots
    // (most recent first), shifting your existing list down rather
    // than replacing it. Timestamps are spaced 1 second apart, walking
    // backward from now, so the guest items land in the same relative
    // order they were searched in.
    const guestIds = getGuestRecents();
    if (guestIds.length > 0) {
      const now = Date.now();
      const rows = guestIds.map((movieId, i) => ({
        user_id: user.id,
        movie_id: movieId,
        searched_at: new Date(now - i * 1000).toISOString(),
      }));
      await supabase.from("recent_searches").upsert(rows, { onConflict: "user_id,movie_id" });
      clearGuestRecents();
    }

    router.push("/");
  }

  async function handleSignUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage("Check your email to confirm your account, then log in.");
  }

  return (
    <div className="login-page-wrap" onClick={() => router.back()}>
      <div className="login-page-content" onClick={(e) => e.stopPropagation()}>
        <Link href="/" className="back-link">
          ← Back to search
        </Link>
        <div className="login-box">
          <h2>Login / Sign up</h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Log in</button>
            <button type="button" onClick={handleSignUp}>Sign up</button>
          </form>
          {message && <p>{message}</p>}
        </div>
      </div>
    </div>
  );
}
