"use client";
import { useState } from "react";
import type { CampaignCreator } from "@/lib/demo";
import { STAGES } from "@/lib/date";
import { CreatorCard } from "./CreatorCard";

export type BoardCard = { cc: CampaignCreator; waitingDays: number; dday: { label: string; days: number } | null };

// Columns follow the Incross board: 2px dark top rule, header row, rows split by 1px lines.
const head = "flex h-14 items-center justify-between border-b border-line";

export function KanbanBoard({ cards }: { cards: BoardCard[] }) {
  const [showDone, setShowDone] = useState(false);
  const done = cards.filter((c) => c.cc.stage === "완료");
  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {STAGES.slice(0, 5).map((stage) => {
        const list = cards.filter((c) => c.cc.stage === stage);
        return (
          <section key={stage} className="min-w-[190px] flex-1 border-t-2 border-ink-900">
            <h3 className={head}>
              <span className="text-[17px] font-bold text-ink-900">{stage}</span>
              <span className="text-[15px] font-semibold tabular-nums text-ink-600">{list.length}</span>
            </h3>
            {list.map((c) => <CreatorCard key={c.cc.id} {...c} />)}
            {list.length === 0 && <p className="py-8 text-center text-[14px] text-ink-600">진행 중인 건이 없습니다</p>}
          </section>
        );
      })}
      {showDone ? (
        <section className="min-w-[190px] flex-1 border-t-2 border-ink-900">
          <h3 className={head}>
            <span className="text-[17px] font-bold text-ink-900">완료</span>
            <button onClick={() => setShowDone(false)} className="text-[14px] text-ink-600 hover:text-primary-600">접기</button>
          </h3>
          {done.map((c) => <CreatorCard key={c.cc.id} {...c} />)}
        </section>
      ) : (
        <button
          onClick={() => setShowDone(true)}
          aria-label={`완료 ${done.length}건 펼치기`}
          className="w-12 shrink-0 border-t-2 border-line-strong pt-4 text-[15px] font-semibold text-ink-600 [writing-mode:vertical-rl] hover:text-primary-600"
        >
          완료 <span className="tabular-nums">{done.length}</span>
        </button>
      )}
    </div>
  );
}
