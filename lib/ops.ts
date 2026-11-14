import { STEPS, type Campaign, type Entry } from "./campaigns";

/**
 * Every change staff can make to campaigns, as plain data. The browser applies an op right away so the screen
 * doesn't wait, and the server applies the same op to the stored list (app/api/campaigns).
 */
export type CampaignInput = Pick<Campaign, "name" | "advertiser" | "channel" | "uploadDate" | "owners" | "confidential">;
export type Op =
  | { op: "addCampaign"; id: string; input: CampaignInput }
  | { op: "deleteCampaign"; id: string }
  /** Mark or unmark 대외비. The server only takes this from one of the campaign's 담당자. */
  | { op: "setConfidential"; id: string; on: boolean }
  | { op: "addEntry"; campaignId: string; id: string; name: string; channel: string }
  | { op: "toggleStep"; campaignId: string; entryId: string; step: number; on: boolean }
  | { op: "setDue"; campaignId: string; entryId: string; step: number; date: string | null }
  | { op: "setDueForAll"; campaignId: string; step: number; date: string | null }
  | { op: "drop"; campaignId: string; entryId: string; on: boolean }
  /** 최종단가, PA 단가, 운송장 for one creator (기획자 11/14). */
  | { op: "setDeal"; campaignId: string; entryId: string; price: number | null; paPrice: number | null; tracking: string; managerEmail: string }
  /** The server always makes the token itself; null takes the invite back. */
  | { op: "invite"; campaignId: string; entryId: string; token: string | null }
  | { op: "unlink"; campaignId: string; entryId: string };

const withDue = (e: Entry, step: number, date: string | null) => STEPS.map((_, i) => (i === step ? date || null : (e.due?.[i] ?? null)));

export function applyOp(list: Campaign[], op: Op, today: string): Campaign[] {
  const inCampaign = (id: string, change: (c: Campaign) => Campaign) => list.map((c) => (c.id === id ? change(c) : c));
  const inEntry = (campaignId: string, entryId: string, change: (e: Entry) => Partial<Entry>) =>
    inCampaign(campaignId, (c) => ({ ...c, entries: c.entries.map((e) => (e.id === entryId ? { ...e, ...change(e) } : e)) }));

  switch (op.op) {
    case "addCampaign":
      if (list.some((c) => c.id === op.id)) return list;
      return [{ ...op.input, id: op.id, createdAt: today, entries: [] }, ...list];
    case "deleteCampaign":
      return list.filter((c) => c.id !== op.id);
    case "setConfidential":
      return inCampaign(op.id, (c) => ({ ...c, confidential: op.on }));
    case "addEntry":
      return inCampaign(op.campaignId, (c) =>
        c.entries.some((e) => e.id === op.id)
          ? c
          : { ...c, entries: [...c.entries, { id: op.id, name: op.name, channel: op.channel, addedAt: today, done: STEPS.map(() => null), due: STEPS.map(() => null), droppedAt: null }] },
      );
    case "toggleStep":
      // A checked step records today's date (KST).
      return inEntry(op.campaignId, op.entryId, (e) => ({ done: STEPS.map((_, i) => (i === op.step ? (op.on ? today : null) : (e.done[i] ?? null))) }));
    case "setDue":
      return inEntry(op.campaignId, op.entryId, (e) => ({ due: withDue(e, op.step, op.date) }));
    case "setDueForAll":
      // The same deadline for every creator still in the campaign (기획안 마감 is usually shared).
      return inCampaign(op.campaignId, (c) => ({ ...c, entries: c.entries.map((e) => (e.droppedAt ? e : { ...e, due: withDue(e, op.step, op.date) })) }));
    case "drop":
      return inEntry(op.campaignId, op.entryId, () => ({ droppedAt: op.on ? today : null }));
    case "setDeal":
      return inEntry(op.campaignId, op.entryId, () => ({ price: op.price, paPrice: op.paPrice, tracking: op.tracking, managerEmail: op.managerEmail }));
    case "invite":
      return inEntry(op.campaignId, op.entryId, (e) => (e.creatorId ? {} : { invite: op.token }));
    case "unlink":
      return inEntry(op.campaignId, op.entryId, () => ({ creatorId: null, invite: null }));
  }
}

const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 120;
const isText = (v: unknown, max = 100): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isStep = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < STEPS.length;
/** Empty, or one plain address. Checked here because it ends up in a mail's recipient list. */
export const isEmailOrEmpty = (v: unknown): v is string => typeof v === "string" && (v === "" || (v.length <= 120 && /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(v)));
const isWonOrNull = (v: unknown): v is number | null => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000_000_000);
const isDateOrNull = (v: unknown): v is string | null => v === null || isDate(v);

/** Checks what a browser sent before the server applies it. Returns null for anything malformed. */
export function parseOp(x: unknown): Op | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  switch (o.op) {
    case "addCampaign": {
      const i = o.input as Record<string, unknown> | undefined;
      if (!isId(o.id) || !i || !isText(i.name) || !isText(i.advertiser) || !isText(i.channel) || !isDate(i.uploadDate)) return null;
      const owners = i.owners;
      if (!Array.isArray(owners) || owners.length === 0 || owners.length > 10 || !owners.every((n) => isText(n, 30))) return null;
      return { op: "addCampaign", id: o.id, input: { name: i.name.trim(), advertiser: i.advertiser.trim(), channel: i.channel.trim(), uploadDate: i.uploadDate, owners: owners.map((n: string) => n.trim()), confidential: i.confidential === true } };
    }
    case "deleteCampaign":
      return isId(o.id) ? { op: "deleteCampaign", id: o.id } : null;
    case "setConfidential":
      return isId(o.id) && typeof o.on === "boolean" ? { op: "setConfidential", id: o.id, on: o.on } : null;
    case "addEntry":
      return isId(o.campaignId) && isId(o.id) && isText(o.name) && isText(o.channel) ? { op: "addEntry", campaignId: o.campaignId, id: o.id, name: o.name.trim(), channel: o.channel.trim() } : null;
    case "toggleStep":
      return isId(o.campaignId) && isId(o.entryId) && isStep(o.step) && typeof o.on === "boolean" ? { op: "toggleStep", campaignId: o.campaignId, entryId: o.entryId, step: o.step, on: o.on } : null;
    case "setDue":
      return isId(o.campaignId) && isId(o.entryId) && isStep(o.step) && isDateOrNull(o.date) ? { op: "setDue", campaignId: o.campaignId, entryId: o.entryId, step: o.step, date: o.date } : null;
    case "setDueForAll":
      return isId(o.campaignId) && isStep(o.step) && isDateOrNull(o.date) ? { op: "setDueForAll", campaignId: o.campaignId, step: o.step, date: o.date } : null;
    case "drop":
      return isId(o.campaignId) && isId(o.entryId) && typeof o.on === "boolean" ? { op: "drop", campaignId: o.campaignId, entryId: o.entryId, on: o.on } : null;
    case "setDeal":
      return isId(o.campaignId) && isId(o.entryId) && isWonOrNull(o.price) && isWonOrNull(o.paPrice) && typeof o.tracking === "string" && o.tracking.length <= 40 && isEmailOrEmpty(o.managerEmail)
        ? { op: "setDeal", campaignId: o.campaignId, entryId: o.entryId, price: o.price, paPrice: o.paPrice, tracking: o.tracking.trim(), managerEmail: o.managerEmail }
        : null;
    case "invite":
      return isId(o.campaignId) && isId(o.entryId) ? { op: "invite", campaignId: o.campaignId, entryId: o.entryId, token: o.token === null ? null : "" } : null;
    case "unlink":
      return isId(o.campaignId) && isId(o.entryId) ? { op: "unlink", campaignId: o.campaignId, entryId: o.entryId } : null;
    default:
      return null;
  }
}
