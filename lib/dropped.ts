"use client";
import { useSyncExternalStore } from "react";

// shortcut: dropped campaign-creator ids live in this browser's localStorage until Supabase exists.
// Board and 오늘 할 일 share it, so a drop on one shows on the other.
const KEY = "dropped-entries";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}

function write(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode: keep it in memory for this visit */
  }
  listeners.forEach((l) => l());
}

const EMPTY: string[] = [];
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDropped() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    dropped: new Set(ids),
    drop: (id: string) => write([...read().filter((x) => x !== id), id]),
    restore: (id: string) => write(read().filter((x) => x !== id)),
  };
}
