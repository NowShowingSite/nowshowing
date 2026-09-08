import { useEffect } from "react";

// Tracks how many modals are currently open across the whole page, so
// scrolling only re-enables once every open modal has closed (in case
// two ever end up open at the same time).
let lockCount = 0;

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    lockCount++;
    document.body.style.overflow = "hidden";

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [locked]);
}
