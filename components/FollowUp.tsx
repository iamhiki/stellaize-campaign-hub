"use client";
import type { WaitingOn } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { updateEntry } from "@/lib/store";
import { FOLLOW_UP_DAYS } from "./badges";
import { DropButton } from "./DropButton";

/**
 * 회신 지연: a creator or advertiser has owed us a reply for FOLLOW_UP_DAYS or more. The row lands in 오늘 할 일
 * so someone contacts them (카톡·메일·전화, outside the hub), and a late creator can be dropped.
 * 기획자 11/11: the 답변 독촉 button only recorded a date and sent nothing, so it was removed.
 */
export function needsFollowUp(waitingOn: WaitingOn | null, days: number) {
  return (waitingOn === "creator" || waitingOn === "advertiser") && days >= FOLLOW_UP_DAYS;
}

export const canDrop = (waitingOn: WaitingOn | null, days: number) => waitingOn === "creator" && days >= FOLLOW_UP_DAYS;

export function LateDrop({ campaignId, entryId, name, waitingOn, days }: {
  campaignId: string;
  entryId: string;
  name: string;
  waitingOn: WaitingOn | null;
  days: number;
}) {
  if (!canDrop(waitingOn, days)) return null;
  return <DropButton name={name} onDrop={() => updateEntry(campaignId, entryId, () => ({ droppedAt: todayKST() }))} />;
}
