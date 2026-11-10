"use client";
import type { WaitingOn } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { updateEntry } from "@/lib/store";
import { FOLLOW_UP_DAYS } from "./badges";
import { DropButton } from "./DropButton";

/**
 * 답변 독촉 records the day we chased someone (카톡·메일·전화 are done outside the hub; nothing is sent from here).
 * 기획자 답변 11/10: 언제든 누를 수 있게 — so the button shows whenever a creator or advertiser owes us a reply.
 * After FOLLOW_UP_DAYS without a reply the row also lands in 오늘 할 일 → 답변 독촉, and a creator can be dropped.
 */
export const canChase = (waitingOn: WaitingOn | null) => waitingOn === "creator" || waitingOn === "advertiser";

export function needsFollowUp(waitingOn: WaitingOn | null, days: number) {
  return canChase(waitingOn) && days >= FOLLOW_UP_DAYS;
}

export function FollowUp({ campaignId, entryId, name, waitingOn, days, remindedAt }: {
  campaignId: string;
  entryId: string;
  name: string;
  waitingOn: WaitingOn | null;
  days: number;
  remindedAt: string | null;
}) {
  if (!canChase(waitingOn)) return null;
  const today = todayKST();
  const remind = () => updateEntry(campaignId, entryId, () => ({ remindedAt: today }));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {remindedAt === today ? (
        <span className="flex min-h-9 items-center gap-2 whitespace-nowrap text-[13px] text-ink-800">
          <b className="font-semibold">오늘 독촉함</b>
          <button type="button" onClick={() => updateEntry(campaignId, entryId, () => ({ remindedAt: null }))} className="text-ink-600 underline underline-offset-4 hover:text-primary-600">
            취소
          </button>
        </span>
      ) : (
        <>
          <button type="button" onClick={remind} className="min-h-9 whitespace-nowrap bg-primary-600 px-3 text-[13px] font-semibold text-white hover:bg-primary-700">
            {remindedAt ? "다시 독촉" : "답변 독촉"}
          </button>
          {remindedAt && <span className="whitespace-nowrap text-[13px] text-ink-600">{remindedAt.slice(5).replace("-", "/")} 독촉함</span>}
        </>
      )}
      {waitingOn === "creator" && days >= FOLLOW_UP_DAYS && <DropButton name={name} onDrop={() => updateEntry(campaignId, entryId, () => ({ droppedAt: today }))} />}
    </div>
  );
}
