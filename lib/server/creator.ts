import { STEPS, SUBMIT_STEPS, UPLOAD, canSee, doneList, dueList, type Campaign, type Entry } from "../campaigns";
import type { Db } from "./db";

export function findByInvite(db: Db, token: string): { campaign: Campaign; entry: Entry } | null {
  if (!token) return null;
  for (const campaign of db.campaigns) {
    const entry = campaign.entries.find((e) => e.invite === token && !e.creatorId && !e.droppedAt);
    if (entry) return { campaign, entry };
  }
  return null;
}

/** Call inside mutate(). The invite works once: linking the account uses it up. */
export function link(entry: Entry, userId: string) {
  entry.creatorId = userId;
  entry.invite = null;
}

/**
 * Everything one creator may see: only the rows linked to their account, and from each row only their own
 * schedule and links (기획자 11/11: 우리가 관리하는 페이지는 못 보고 자기 할 일만). No other creators, no owners,
 * no internal 리포트 작성 step.
 */
export const creatorView = (db: Db, userId: string) => view(db, (e) => e.creatorId === userId);

/** One row as its creator would see it, whether or not anyone has joined it yet. For developers, read-only. */
export const previewView = (db: Db, entryId: string, userName: string) => view({ ...db, campaigns: db.campaigns.filter((c) => canSee(c, userName)) }, (e) => e.id === entryId);

/** Rows a developer can preview. */
export const previewChoices = (db: Db, userName: string) => db.campaigns.filter((c) => canSee(c, userName)).flatMap((c) => c.entries.filter((e) => !e.droppedAt).map((e) => ({ entryId: e.id, label: `${c.name} · ${e.name}` })));

function view(db: Db, mine: (e: Entry) => boolean) {
  return db.campaigns.flatMap((c) =>
    c.entries
      .filter((e) => mine(e) && !e.droppedAt)
      .map((e) => {
        const done = doneList(e);
        const dues = dueList(e, c);
        const next = done.findIndex((d) => !d);
        return {
          campaignId: c.id,
          entryId: e.id,
          campaign: c.name,
          advertiser: c.advertiser,
          channel: e.channel,
          // 기획자 11/14: 본인 최종단가는 보여 준다(매번 확인시킨다). 예산은 광고주 대외비라 보내지 않는다.
          price: e.price ?? null,
          paPrice: e.paPrice ?? null,
          tracking: e.tracking ?? "",
          steps: STEPS.slice(0, UPLOAD + 1).map((s, i) => ({ step: i, label: s.label, waits: s.waits, due: dues[i], done: done[i], next: i === next, submit: SUBMIT_STEPS.includes(i) })),
          submissions: db.submissions.filter((s) => s.entryId === e.id).map(({ id, step, url, note, at, file, text }) => ({ id, step, url, note, at, file: file ? { name: file.name, size: file.size } : null, text: text ?? "" })),
          // 기획안 양식 to download (기획자 11/20). Name and size only; the file comes from /api/files.
          template: (c.template ?? db.defaultTemplate) ? { name: (c.template ?? db.defaultTemplate)!.name, size: (c.template ?? db.defaultTemplate)!.size } : null,
          notices: db.notices.filter((n) => n.entryId === e.id && n.userId === e.creatorId && !done[n.step]).map(({ id, step, due, createdAt }) => ({ id, step, due, createdAt })),
        };
      }),
  );
}
export type CreatorItem = ReturnType<typeof creatorView>[number];
