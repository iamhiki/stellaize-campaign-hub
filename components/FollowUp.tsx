"use client";
import type { WaitingOn } from "@/lib/campaigns";
import { dropEntry } from "@/lib/store";
import { DropButton } from "./DropButton";

/**
 * 기획자 11/13: a day late already squeezes the upload date, so there is no "3 days without a reply" rule any more.
 * Lateness is the step deadline (마감 지남); a creator we are waiting on can be dropped at any time.
 * 기획자 11/11: the 답변 독촉 button only recorded a date and sent nothing, so it was removed.
 */
export const canDrop = (waitingOn: WaitingOn | null) => waitingOn === "creator";

export function LateDrop({ campaignId, entryId, name, waitingOn }: {
  campaignId: string;
  entryId: string;
  name: string;
  waitingOn: WaitingOn | null;
}) {
  if (!canDrop(waitingOn)) return null;
  return <DropButton name={name} onDrop={() => dropEntry(campaignId, entryId, true)} />;
}
