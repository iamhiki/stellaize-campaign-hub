"use client";
import { useSyncExternalStore } from "react";
import { todayKST } from "./date";
import type { Campaign, Submission } from "./campaigns";
import { applyOp, type CampaignInput, type Op } from "./ops";

// Staff screens read one copy of the server's data (GET /api/campaigns). A change shows on screen at once and
// is sent to the server in order; the server's answer then replaces the copy. The copy is refreshed every 20
// seconds and when the tab comes back, so a teammate's check or a creator's link shows up without reloading.
export type NoticeInfo = { id: string; entryId: string; step: number; due: string; createdAt: string; emailedAt: string | null };
export type ProfileInfo = { userId: string; legalName: string; phone: string; address: string; idDoc: boolean; bankCopy: boolean };
type Snapshot = { campaigns: Campaign[]; submissions: Submission[]; notices: NoticeInfo[]; accounts: Record<string, string>; profiles?: Record<string, ProfileInfo> };

const listeners = new Set<() => void>();
let cache: Snapshot | null = null;
let saveError = "";
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0; // changes sent but not answered yet; refreshes wait so they can't undo them on screen
let timer: ReturnType<typeof setInterval> | undefined;

const emit = () => listeners.forEach((l) => l());

async function request(init?: RequestInit) {
  const res = await fetch("/api/campaigns", { cache: "no-store", ...init });
  if ((res.status === 401 || res.status === 403) && !["/login", "/signup", "/join", "/about"].includes(window.location.pathname)) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load on purpose: it drops the previous account's data from memory
    window.location.assign("/login");
    throw new Error("signed out");
  }
  if (!res.ok) throw new Error("save failed");
  return (await res.json()) as Snapshot;
}

function refresh() {
  if (waiting > 0 || document.hidden) return;
  request()
    .then((next) => {
      if (waiting > 0) return;
      cache = next;
      emit();
    })
    .catch(() => {});
}

function send(op: Op, optimistic = true) {
  if (cache && optimistic) {
    cache = { ...cache, campaigns: applyOp(cache.campaigns, op, todayKST()) };
    emit();
  }
  waiting++;
  queue = queue
    .then(() => request({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) }))
    .then((next) => {
      waiting--;
      saveError = "";
      if (waiting === 0) cache = next;
      emit();
    })
    .catch(() => {
      waiting--;
      saveError = "저장하지 못했습니다. 연결을 확인한 뒤 다시 해 주세요.";
      emit();
      refresh(); // show what the server really has
    });
}

let readers = 0; // components showing staff data; the refresh timer runs while there is at least one
function subscribe(l: () => void) {
  listeners.add(l);
  if (++readers === 1) {
    refresh();
    timer = setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh);
  }
  return () => {
    listeners.delete(l);
    if (--readers === 0) {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    }
  };
}

const EMPTY_SUBMISSIONS: Submission[] = [];
const EMPTY_NOTICES: NoticeInfo[] = [];
const EMPTY_ACCOUNTS: Record<string, string> = {};
const EMPTY_PROFILES: Record<string, ProfileInfo> = {};

/** All campaigns, or null until the server has answered. */
export const useCampaigns = () => useSyncExternalStore(subscribe, () => cache?.campaigns ?? null, () => null);
/** Links creators handed in. */
export const useSubmissions = () => useSyncExternalStore(subscribe, () => cache?.submissions ?? EMPTY_SUBMISSIONS, () => EMPTY_SUBMISSIONS);
/** Deadline notices shown to creators so far. */
export const useNotices = () => useSyncExternalStore(subscribe, () => cache?.notices ?? EMPTY_NOTICES, () => EMPTY_NOTICES);
/** entry id → name on the creator account linked to it. */
export const useAccounts = () => useSyncExternalStore(subscribe, () => cache?.accounts ?? EMPTY_ACCOUNTS, () => EMPTY_ACCOUNTS);
/** entry id → shipping info the creator typed in, and which documents they uploaded. */
export const useProfiles = () => useSyncExternalStore(subscribe, () => cache?.profiles ?? EMPTY_PROFILES, () => EMPTY_PROFILES);
/** "" unless the last change didn't reach the server. */
// Only listens. The save-error bar sits on every page (login and the creator screen too), so it must not start
// loading staff data: signed out, that load answers 401 and sends the page to /login, over and over.
const listen = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useSaveError = () => useSyncExternalStore(listen, () => saveError, () => "");

const noSubscribe = () => () => {};
/** Today (KST) in the browser; "" while prerendering, so the build never freezes a date into the page. */
export const useToday = () => useSyncExternalStore(noSubscribe, () => todayKST(), () => "");

// randomUUID needs https; the team may open this over plain http on the company network.
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export type { CampaignInput };

export function addCampaign(input: CampaignInput) {
  const id = newId();
  send({ op: "addCampaign", id, input });
  return id;
}
export const deleteCampaign = (id: string) => send({ op: "deleteCampaign", id });
export const addEntry = (campaignId: string, name: string, channel: string) => send({ op: "addEntry", campaignId, id: newId(), name, channel });
/** Check or uncheck one step; a checked step records today's date (KST). */
export const toggleStep = (campaignId: string, entryId: string, step: number, on: boolean) => send({ op: "toggleStep", campaignId, entryId, step, on });
/** Set or clear one step's deadline for one creator. For 업로드 this is the creator's own upload date. */
export const setDue = (campaignId: string, entryId: string, step: number, date: string | null) => send({ op: "setDue", campaignId, entryId, step, date });
/** The same deadline for every creator still in the campaign. */
export const setDueForAll = (campaignId: string, step: number, date: string | null) => send({ op: "setDueForAll", campaignId, step, date });
export const dropEntry = (campaignId: string, entryId: string, on: boolean) => send({ op: "drop", campaignId, entryId, on });
/** 최종단가, PA 단가 (null = 단가 내 포함), 운송장 for one creator. The creator sees these on 내 일정. */
export const setDeal = (campaignId: string, entryId: string, price: number | null, paPrice: number | null, tracking: string) => send({ op: "setDeal", campaignId, entryId, price, paPrice, tracking });
/** Make (or take back) a creator's invite link. The link appears once the server has made its code. */
export const inviteCreator = (campaignId: string, entryId: string, on: boolean) => send({ op: "invite", campaignId, entryId, token: on ? "" : null }, !on);
export const unlinkCreator = (campaignId: string, entryId: string) => send({ op: "unlink", campaignId, entryId });
