"use client";
import { useEffect } from "react";

// Reveals every [data-reveal] element as it scrolls into view, and resets it once it drops back below
// the viewport so the motion plays again on the next pass. Content stays visible if JS or motion is off.
export function RevealOnScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const els = document.querySelectorAll("[data-reveal]");
    let heard = false;
    const io = new IntersectionObserver(
      (entries) => {
        heard = true;
        for (const e of entries) {
          if (e.isIntersecting) e.target.setAttribute("data-shown", "");
          else if (e.boundingClientRect.top > 0) e.target.removeAttribute("data-shown");
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    root.classList.add("reveal-ready");
    els.forEach((el) => io.observe(el));
    // Safety net: if the observer never reports (some embedded or headless browsers), never leave content hidden.
    const fallback = setTimeout(() => {
      if (heard) return;
      io.disconnect();
      root.classList.remove("reveal-ready");
    }, 1000);
    return () => {
      clearTimeout(fallback);
      io.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}
