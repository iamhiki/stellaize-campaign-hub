"use client";
import { useState } from "react";

// Dropping takes a creator out of the campaign, so it asks once inline before doing it (no modal).
export function DropButton({ name, onDrop }: { name: string; onDrop: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" onClick={() => setAsking(true)} className="min-h-9 w-fit border border-danger-700 px-3 text-[13px] font-semibold text-danger-700 hover:bg-danger-700 hover:text-white">
        드랍
      </button>
    );
  return (
    <div role="group" aria-label={`${name} 드랍 확인`} className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-ink-800">{name} 님을 이 캠페인에서 뺄까요?</span>
      <button type="button" onClick={onDrop} className="min-h-9 bg-danger-700 px-3 font-semibold text-white hover:bg-[#8c2525]">
        드랍
      </button>
      <button type="button" onClick={() => setAsking(false)} className="min-h-9 border border-line px-3 font-semibold text-ink-800 hover:border-ink-600">
        취소
      </button>
    </div>
  );
}
