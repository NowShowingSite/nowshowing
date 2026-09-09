"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BackLink() {
  const [fromWatchlist, setFromWatchlist] = useState(false);

  useEffect(() => {
    setFromWatchlist(!!sessionStorage.getItem("reopenWatchlist"));
  }, []);

  return (
    <Link href="/" className="back-link">
      ← {fromWatchlist ? "Back to Watchlist" : "Back to search"}
    </Link>
  );
}
