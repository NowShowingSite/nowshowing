// A logged-out visitor's "Recently Searched" list, kept in
// sessionStorage only -- it's tied to this browser tab/session and
// disappears when the tab closes, unlike a logged-in account's list
// which lives in the database permanently.

const GUEST_KEY = "guestRecentSearches";
const MAX_ITEMS = 16;

export function addGuestRecent(movieId: string) {
  if (typeof window === "undefined") return;
  let list = getGuestRecents();
  list = list.filter((id) => id !== movieId); // avoid duplicates, re-add at the front
  list.unshift(movieId);
  list = list.slice(0, MAX_ITEMS);
  sessionStorage.setItem(GUEST_KEY, JSON.stringify(list));
}

export function getGuestRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearGuestRecents() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(GUEST_KEY);
}
