"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin() {
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

    router.push("/");
  }

  async function handleSignUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage("Check your email to confirm your account, then log in.");
  }

  return (
    <div className="login-box">
      <Link href="/" className="back-link">
        ← Back to search
      </Link>
      <h2>Login / Sign up</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />
      <button onClick={handleLogin}>Log in</button>
      <button onClick={handleSignUp}>Sign up</button>
      {message && <p>{message}</p>}
    </div>
  );
}
