"use client";
import { useState } from "react";
import type { CampaignCreator } from "@/lib/demo";
import { WaitingLine, DdayLine } from "./badges";

// Incross board row: no box, separated by a 1px line.
export function CreatorCard({ cc, waitingDays, dday }: {
  cc: CampaignCreator;
  waitingDays: number;
  dday: { label: string; days: number } | null;
}) {
  // shortcut: checks live in component state only, lost on reload. Save to Supabase when it exists.
  const [checklist, setChecklist] = useState(cc.checklist);
  const done = checklist.filter((c) => c.done).length;
  return (
    <article className="flex flex-col gap-1.5 border-b border-line py-4">
      <p className="truncate text-[16px] font-bold text-ink-900">{cc.name}</p>
      <p className="truncate pb-1 text-[13px] text-ink-600">
        {cc.channel} · <span className="tabular-nums">{cc.followers}</span>
      </p>
      <WaitingLine on={cc.waitingOn} days={waitingDays} />
      {dday && <DdayLine label={dday.label} days={dday.days} />}
      <details className="pt-1 text-[13px] text-ink-800">
        <summary className="w-fit cursor-pointer text-ink-600 hover:text-primary-600">
          체크 <span className="tabular-nums">{done}/{checklist.length}</span>
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {checklist.map((c) => (
            <li key={c.id}>
              <label className="flex items-start gap-1.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-primary-600"
                  checked={c.done}
                  onChange={(e) => setChecklist((l) => l.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)))}
                />
                <span className={c.done ? "text-ink-600 line-through" : undefined}>{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
