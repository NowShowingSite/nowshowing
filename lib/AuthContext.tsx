"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabaseClient";

type AuthState = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
};

const defaultState: AuthState = {
  loading: true,
  userId: null,
  email: null,
  isAdmin: false,
};

const AuthContext = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [state, setState] = useState<AuthState>(defaultState);

  async function loadAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, userId: null, email: null, isAdmin: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    setState({
      loading: false,
      userId: user.id,
      email: user.email ?? null,
      isAdmin: profile?.is_admin ?? false,
    });
  }

  useEffect(() => {
    loadAuth();

    // Only re-checks on actual login/logout events, not on every page
    // navigation -- this is the whole point: previously, several
    // separate components each re-asked "who's logged in, are they
    // admin?" on every single page load. Now it's asked once here and
    // shared everywhere via context.
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadAuth();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
