"use client";
import type { WaitingOn } from "@/lib/demo";
import { todayKST } from "@/lib/date";
import { useDropped, useReminded } from "@/lib/dropped";
import { OVERDUE_DAYS } from "./badges";
import { DropButton } from "./DropButton";

// No reply for OVERDUE_DAYS+: chase anyone (답변 독촉); a creator can also be dropped (planner: no reply → leave them out).
export function needsFollowUp(waitingOn: WaitingOn | null, days: number) {
  return (waitingOn === "creator" || waitingOn === "advertiser") && days >= OVERDUE_DAYS;
}

export function FollowUp({ entryId, name, waitingOn, days }: { entryId: string; name: string; waitingOn: WaitingOn | null; days: number }) {
  const { drop } = useDropped();
  const { remindedOn, remind, undo } = useReminded();
  if (!needsFollowUp(waitingOn, days)) return null;
  const on = remindedOn(entryId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {on ? (
        <span className="flex min-h-9 items-center gap-2 text-[13px] text-ink-800">
          <b className="font-semibold">{on === todayKST() ? "오늘 독촉함" : `${on.slice(5).replace("-", "/")} 독촉함`}</b>
          <button type="button" onClick={() => undo(entryId)} className="text-ink-600 underline underline-offset-4 hover:text-primary-600">
            취소
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => remind(entryId)} className="min-h-9 bg-primary-600 px-3 text-[13px] font-semibold text-white hover:bg-primary-700">
          답변 독촉
        </button>
      )}
      {waitingOn === "creator" && <DropButton name={name} onDrop={() => drop(entryId)} />}
    </div>
  );
}
