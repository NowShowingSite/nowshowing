"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BackLink() {
  const [label, setLabel] = useState("Back to search");

  useEffect(() => {
    if (sessionStorage.getItem("reopenWatchlist")) {
      setLabel("Back to Watchlist");
      return;
    }
    const raw = sessionStorage.getItem("reopenBrowse");
    if (raw) {
      try {
        const ctx = JSON.parse(raw);
        if (ctx.kind === "genre") setLabel(`Back to ${ctx.value}`);
        else if (ctx.kind === "decade") setLabel(`Back to ${ctx.value}s`);
      } catch {
        // ignore malformed/stale value, keep default label
      }
    }
  }, []);

  return (
    <Link href="/" className="back-link">
      ← {label}
    </Link>
  );
}
