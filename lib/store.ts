"use client";
import { useSyncExternalStore } from "react";
import { todayKST } from "./date";
import { STEPS, type Campaign, type Entry } from "./campaigns";
import { demoCampaigns } from "./demo";

// shortcut: campaigns live in this browser's localStorage until Supabase exists. Every screen reads this one
// list, so a check on the board shows up in 오늘 할 일 right away. Until the first edit, the demo campaigns show.
const KEY = "campaign-hub:campaigns:v2";
const listeners = new Set<() => void>();
let cache: Campaign[] | null = null;

function read(): Campaign[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    cache = null;
  }
  cache ??= demoCampaigns(todayKST());
  return cache;
}

function write(next: Campaign[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it in memory for this visit */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** All campaigns, or null during the server render and first paint (the data only exists in the browser). */
export const useCampaigns = () => useSyncExternalStore(subscribe, read, () => null);

const noSubscribe = () => () => {};
/** Today (KST) in the browser; "" while prerendering, so the build never freezes a date into the page. */
export const useToday = () => useSyncExternalStore(noSubscribe, () => todayKST(), () => "");

// randomUUID needs https; the team may open this over plain http on the company network.
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export type CampaignInput = Pick<Campaign, "name" | "advertiser" | "channel" | "uploadDate" | "owners">;

export function addCampaign(input: CampaignInput) {
  const campaign: Campaign = { ...input, id: newId(), createdAt: todayKST(), entries: [] };
  write([campaign, ...read()]);
  return campaign.id;
}

export function deleteCampaign(id: string) {
  write(read().filter((c) => c.id !== id));
}

export function addEntry(campaignId: string, name: string, channel: string) {
  const entry: Entry = { id: newId(), name, channel, addedAt: todayKST(), done: STEPS.map(() => null), due: STEPS.map(() => null), droppedAt: null, remindedAt: null };
  write(read().map((c) => (c.id === campaignId ? { ...c, entries: [...c.entries, entry] } : c)));
}

export function updateEntry(campaignId: string, entryId: string, change: (e: Entry) => Partial<Entry>) {
  write(
    read().map((c) =>
      c.id === campaignId ? { ...c, entries: c.entries.map((e) => (e.id === entryId ? { ...e, ...change(e) } : e)) } : c,
    ),
  );
}

/**
 * Check or uncheck one step; a checked step records today's date (KST). Checking clears the 독촉 record,
 * because that was about the step that just got its answer.
 */
export const toggleStep = (campaignId: string, entryId: string, step: number, on: boolean) =>
  updateEntry(campaignId, entryId, (e) => ({
    done: STEPS.map((_, i) => (i === step ? (on ? todayKST() : null) : (e.done[i] ?? null))),
    ...(on ? { remindedAt: null } : {}),
  }));

const withDue = (e: Entry, step: number, date: string | null) => STEPS.map((_, i) => (i === step ? date || null : (e.due?.[i] ?? null)));

/** Set or clear one step's deadline for one creator. For 업로드 this is the creator's own upload date. */
export const setDue = (campaignId: string, entryId: string, step: number, date: string | null) =>
  updateEntry(campaignId, entryId, (e) => ({ due: withDue(e, step, date) }));

/** The same deadline for every creator still in the campaign (기획안 마감 is usually shared). */
export function setDueForAll(campaignId: string, step: number, date: string | null) {
  write(read().map((c) => (c.id === campaignId ? { ...c, entries: c.entries.map((e) => (e.droppedAt ? e : { ...e, due: withDue(e, step, date) })) } : c)));
}

/** Back to the example data. Only for the demo period. */
export function resetToDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
  cache = null;
  listeners.forEach((l) => l());
}
