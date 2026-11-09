"use client";
import type { WaitingOn } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { updateEntry } from "@/lib/store";
import { FOLLOW_UP_DAYS } from "./badges";
import { DropButton } from "./DropButton";

// No reply for FOLLOW_UP_DAYS+: chase anyone (답변 독촉); a creator can also be dropped (planner: no reply → leave them out).
export function needsFollowUp(waitingOn: WaitingOn | null, days: number) {
  return (waitingOn === "creator" || waitingOn === "advertiser") && days >= FOLLOW_UP_DAYS;
}

export function FollowUp({ campaignId, entryId, name, waitingOn, days, remindedAt }: {
  campaignId: string;
  entryId: string;
  name: string;
  waitingOn: WaitingOn | null;
  days: number;
  remindedAt: string | null;
}) {
  if (!needsFollowUp(waitingOn, days)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {remindedAt ? (
        <span className="flex min-h-9 items-center gap-2 whitespace-nowrap text-[13px] text-ink-800">
          <b className="font-semibold">{remindedAt === todayKST() ? "오늘 독촉함" : `${remindedAt.slice(5).replace("-", "/")} 독촉함`}</b>
          <button type="button" onClick={() => updateEntry(campaignId, entryId, () => ({ remindedAt: null }))} className="text-ink-600 underline underline-offset-4 hover:text-primary-600">
            취소
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => updateEntry(campaignId, entryId, () => ({ remindedAt: todayKST() }))} className="min-h-9 whitespace-nowrap bg-primary-600 px-3 text-[13px] font-semibold text-white hover:bg-primary-700">
          답변 독촉
        </button>
      )}
      {waitingOn === "creator" && <DropButton name={name} onDrop={() => updateEntry(campaignId, entryId, () => ({ droppedAt: todayKST() }))} />}
    </div>
  );
}
