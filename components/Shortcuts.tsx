"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SHORTCUTS } from "@/lib/shortcuts";

// Linear-style "G then key" navigation. Ignored while typing in a field.
export function Shortcuts() {
  const router = useRouter();
  useEffect(() => {
    let armed = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "g") {
        armed = Date.now();
        return;
      }
      if (Date.now() - armed > 1500) return;
      armed = 0;
      const hit = SHORTCUTS.find(([k]) => k === key);
      if (hit) router.push(hit[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
