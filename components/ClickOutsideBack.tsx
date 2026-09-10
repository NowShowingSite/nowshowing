"use client";

import { useRouter } from "next/navigation";

export default function ClickOutsideBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="page-click-back-wrap" onClick={() => router.back()}>
      <div style={{ width: "fit-content", maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
