"use client";
import { useState } from "react";
import type { CampaignCreator } from "@/lib/demo";
import { STAGES } from "@/lib/date";
import { CreatorCard } from "./CreatorCard";
import { useDropped } from "@/lib/dropped";

export type BoardCard = { cc: CampaignCreator; waitingDays: number; dday: { label: string; days: number } | null };

// Columns follow the Incross board: 2px dark top rule, header row, rows split by 1px lines.
const head = "flex h-14 items-center justify-between border-b border-line";

export function KanbanBoard({ cards: all }: { cards: BoardCard[] }) {
  const [showDone, setShowDone] = useState(false);
  const { dropped, drop, restore } = useDropped();
  const cards = all.filter((c) => !dropped.has(c.cc.id));
  const out = all.filter((c) => dropped.has(c.cc.id));
  const done = cards.filter((c) => c.cc.stage === "완료");
  return (
    // Phone: stages stack top to bottom instead of scrolling sideways.
    <div className="flex flex-col gap-8 pb-2 md:flex-row md:gap-6 md:overflow-x-auto">
      {STAGES.slice(0, 5).map((stage) => {
        const list = cards.filter((c) => c.cc.stage === stage);
        return (
          <section key={stage} className="flex-1 border-t-2 border-ink-900 md:min-w-[190px]">
            <h3 className={head}>
              <span className="text-[17px] font-bold text-ink-900">{stage}</span>
              <span className="text-[15px] font-semibold tabular-nums text-ink-600">{list.length}</span>
            </h3>
            {list.map((c) => <CreatorCard key={c.cc.id} {...c} onDrop={() => drop(c.cc.id)} />)}
            {list.length === 0 && <p className="py-8 text-center text-[14px] text-ink-600">진행 중인 건이 없습니다</p>}
          </section>
        );
      })}
      {showDone ? (
        <section className="flex-1 border-t-2 border-ink-900 md:min-w-[190px]">
          <h3 className={head}>
            <span className="text-[17px] font-bold text-ink-900">완료</span>
            <button onClick={() => setShowDone(false)} aria-expanded="true" className="min-h-11 text-[14px] text-ink-600 hover:text-primary-600">접기</button>
          </h3>
          {done.map((c) => <CreatorCard key={c.cc.id} {...c} />)}
        </section>
      ) : (
        <button
          onClick={() => setShowDone(true)}
          aria-label={`완료 ${done.length}건 펼치기`}
          aria-expanded="false"
          className="flex h-12 shrink-0 items-center border-t-2 border-line-strong text-[15px] font-semibold text-ink-600 hover:text-primary-600 md:h-auto md:w-12 md:items-start md:pt-4 md:[writing-mode:vertical-rl]"
        >
          완료 <span className="tabular-nums">{done.length}</span>
        </button>
      )}
      {out.length > 0 && (
        <section className="flex-1 border-t-2 border-line-strong md:min-w-[190px]">
          <h3 className={head}>
            <span className="text-[17px] font-bold text-ink-600">드랍</span>
            <span className="text-[15px] font-semibold tabular-nums text-ink-600">{out.length}</span>
          </h3>
          {out.map((c) => (
            <CreatorCard key={c.cc.id} {...c} onRestore={() => restore(c.cc.id)} />
          ))}
        </section>
      )}
    </div>
  );
}
