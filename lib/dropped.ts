"use client";
import { useSyncExternalStore } from "react";
import { todayKST } from "./date";

// shortcut: drops and reminders live in this browser's localStorage until Supabase exists.
// Board and 오늘 할 일 share them, so an action on one shows on the other.
function store<T>(key: string, empty: T) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;
  const read = (): T => {
    if (cache !== null) return cache;
    try {
      cache = JSON.parse(localStorage.getItem(key) ?? "null") ?? empty;
    } catch {
      cache = empty;
    }
    return cache as T;
  };
  const write = (value: T) => {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: keep it in memory for this visit */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return { read, write, use: () => useSyncExternalStore(subscribe, read, () => empty) };
}

const dropped = store<string[]>("dropped-entries", []);
const reminded = store<Record<string, string>>("reminded-entries", {}); // entry id -> date of last reminder

export function useDropped() {
  const ids = dropped.use();
  return {
    dropped: new Set(ids),
    drop: (id: string) => dropped.write([...dropped.read().filter((x) => x !== id), id]),
    restore: (id: string) => dropped.write(dropped.read().filter((x) => x !== id)),
  };
}

export function useReminded() {
  const map = reminded.use();
  return {
    remindedOn: (id: string): string | undefined => map[id],
    remind: (id: string) => reminded.write({ ...reminded.read(), [id]: todayKST() }),
    undo: (id: string) => {
      const next = { ...reminded.read() };
      delete next[id];
      reminded.write(next);
    },
  };
}
