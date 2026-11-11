"use client";
import { useSyncExternalStore } from "react";

export type Me = { id: string; role: "staff" | "creator" | "dev"; name: string; email: string };

// undefined = still asking the server, null = signed out.
let me: Me | null | undefined;
let asked = false;
const listeners = new Set<() => void>();

function ask() {
  asked = true;
  fetch("/api/me", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { me: Me | null }) => (me = d.me))
    .catch(() => (me = null))
    .finally(() => listeners.forEach((l) => l()));
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!asked) ask();
  return () => listeners.delete(l);
}

/** The signed-in account. undefined while loading (and on the server), null when signed out. */
export const useMe = () => useSyncExternalStore(subscribe, () => me, () => undefined);

/** POST JSON to this site's API. Resolves to the error message to show, or "" when it worked. */
export async function post(url: string, data: unknown): Promise<string> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) return "";
    const d = await res.json().catch(() => null);
    return d?.error ?? "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
  } catch {
    return "서버에 연결하지 못했습니다. 연결을 확인해 주세요.";
  }
}

export async function logout() {
  await post("/api/auth/logout", {});
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load on purpose: it drops the previous account's data from memory
  window.location.assign("/login");
}
