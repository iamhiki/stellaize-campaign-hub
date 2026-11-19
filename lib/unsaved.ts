"use client";
import { useEffect, useRef } from "react";

/**
 * Asks before leaving the page (닫기, 새로고침, 다른 주소) while a form holds typed text that isn't saved yet.
 * Put `onInput` on the form and call `saved()` once it went through. In-site links don't trigger it; the forms
 * that use it are inline and stay open across them only if the page stays.
 */
export function useUnsaved() {
  const dirty = useRef(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = ""; // older browsers need it set to show the prompt
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return {
    onInput: () => {
      dirty.current = true;
    },
    saved: () => {
      dirty.current = false;
    },
  };
}
