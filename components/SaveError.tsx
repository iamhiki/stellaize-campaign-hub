"use client";
import { useSaveError } from "@/lib/store";

/** Says so when a check or an edit didn't reach the server, instead of quietly showing something unsaved. */
export function SaveError() {
  const error = useSaveError();
  if (!error) return null;
  return (
    <p role="alert" className="fixed inset-x-0 bottom-0 z-30 bg-danger-700 px-5 py-3 text-center text-[15px] font-semibold text-white">
      {error}
    </p>
  );
}
