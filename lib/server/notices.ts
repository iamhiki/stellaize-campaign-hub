import { STEPS, dueList, type Notice } from "../campaigns";
import { newId } from "./auth";
import type { Db } from "./db";

/**
 * 기획자 11/11: 일정을 등록해 두고 마감을 안 지키면 알림. For every creator who has joined, each step that is theirs,
 * unchecked, and past its deadline gets one notice (per step and deadline, so a moved deadline can notify again).
 * The creator sees it on their screen. Mail is not sent yet: `emailedAt` stays null until a mail account is
 * connected, and whatever sends mail then picks up the notices that still have it empty.
 * Returns how many were added.
 */
export function queueNotices(db: Db, today: string) {
  const known = new Set(db.notices.map((n) => n.key));
  const fresh: Notice[] = [];
  for (const c of db.campaigns) {
    for (const e of c.entries) {
      if (e.droppedAt || !e.creatorId) continue;
      const dues = dueList(e, c);
      STEPS.forEach((s, step) => {
        const due = dues[step];
        if (s.waits !== "creator" || e.done[step] || !due || due >= today) return;
        const key = `${e.id}:${step}:${due}`;
        if (known.has(key)) return;
        fresh.push({ id: newId(), key, userId: e.creatorId!, campaignId: c.id, entryId: e.id, step, due, createdAt: today, emailedAt: null });
      });
    }
  }
  db.notices.push(...fresh);
  return fresh.length;
}
