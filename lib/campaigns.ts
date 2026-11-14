import { daysBetween, reportDue } from "./date";

// The shapes and the rules. The data itself lives on the server (lib/server/db.ts) and reaches screens through lib/store.ts.
export type WaitingOn = "advertiser" | "creator" | "us";

/**
 * One creator's process in a campaign, in order (기획자 피드백 2026-11-07: 리스트업 제외, 부킹 요청 → 업로드).
 * `waits` is who the step is waiting on while it's the next unchecked one. 리포트 작성 closes the process.
 */
export const STEPS: { label: string; waits: WaitingOn }[] = [
  { label: "부킹 요청", waits: "us" },
  { label: "부킹 완료", waits: "creator" },
  { label: "정산 서류 수급", waits: "creator" },
  { label: "기획안 수급", waits: "creator" },
  { label: "기획안 컨펌", waits: "advertiser" },
  { label: "가편안 수급", waits: "creator" },
  { label: "가편안 컨펌", waits: "advertiser" },
  { label: "수정본 수급", waits: "creator" },
  { label: "수정본 컨펌", waits: "advertiser" },
  { label: "업로드", waits: "creator" },
  { label: "리포트 작성", waits: "us" },
];
export const UPLOAD = STEPS.findIndex((s) => s.label === "업로드");
export const REPORT = STEPS.length - 1;

/**
 * A creator in one campaign. `done[i]` is the date step i was checked, or null.
 * `due[i]` is step i's deadline, or null (기획자 답변 11/10: 단계별 마감 필요, 업로드 날짜는 크리에이터마다 지정).
 * due[UPLOAD] is this creator's upload date; when it's empty the campaign's upload date applies.
 */
export type Entry = {
  id: string;
  name: string;
  channel: string;
  addedAt: string;
  done: (string | null)[];
  /** Missing in data saved before 11/10; read it through dueList. */
  due?: (string | null)[];
  droppedAt: string | null;
  /** One-time code in the creator's invite link, until they join (기획자 11/11: 크리에이터 로그인). Staff only. */
  invite?: string | null;
  /** The creator account linked to this row. That account sees this row and nothing else. */
  creatorId?: string | null;
  /** 최종단가, won: the price confirmed again at 부킹 요청 (기획자 11/14). The creator sees their own; the budget stays hidden. */
  price?: number | null;
  /** PA 광고 1개월 단가, won. 0 = free, null = included in 최종단가. */
  paPrice?: number | null;
  /** 운송장 번호 of the product sent to this creator. */
  tracking?: string;
  /** 소속사 담당자 메일, when the creator has one. Deadline mail goes to them too. */
  managerEmail?: string;
};

/** Steps where the creator hands something in (기획자 11/11: 기획안, 가편안, 수정본을 플랫폼에서 받기). */
export const SUBMIT_STEPS = ["기획안 수급", "가편안 수급", "수정본 수급"].map((l) => STEPS.findIndex((s) => s.label === l));

/** A link the creator handed in for one step. Files stay where the creator keeps them (드라이브, 유튜브 등). */
export type Submission = { id: string; campaignId: string; entryId: string; step: number; url: string; note: string; at: string };

/** A deadline reminder for one step (made the day before the deadline). `emailedAt` stays null until the mail has gone out. */
export type Notice = { id: string; key: string; userId: string; campaignId: string; entryId: string; step: number; due: string; createdAt: string; emailedAt: string | null };

export type Campaign = {
  id: string;
  name: string;
  advertiser: string;
  channel: string;
  uploadDate: string;
  owners: string[];
  createdAt: string;
  entries: Entry[];
  /** 대외비: only the staff named in `owners` get this campaign from the server. */
  confidential?: boolean;
};

/**
 * Whether a staff account may see (and change) a campaign: everyone for an ordinary one, only its 담당자 for 대외비.
 * shortcut: 담당자 are matched by account name, so two accounts with the same name both get in. Store account ids
 * in `owners` before 대외비 holds anything a teammate must really not see.
 */
export const canSee = (c: Campaign, userName: string) => !c.confidential || c.owners.includes(userName);

export const doneList = (e: Entry) => STEPS.map((_, i) => e.done[i] ?? null);

/** This creator's upload date: their own, or the campaign's. */
export const uploadDateOf = (e: Entry, c: Campaign) => e.due?.[UPLOAD] || c.uploadDate;

/**
 * Every step's deadline for one creator. Upload falls back to the campaign's upload date; the report is
 * due 14 days after the upload is checked unless someone set a date for it.
 */
export function dueList(e: Entry, c: Campaign) {
  const uploadedAt = e.done[UPLOAD];
  return STEPS.map((_, i) => {
    const set = e.due?.[i] || null;
    if (i === UPLOAD) return uploadDateOf(e, c);
    if (i === REPORT) return set ?? (uploadedAt ? reportDue(uploadedAt) : null);
    return set;
  });
}

export type Deadline = { label: string; date: string; days: number };

/** Where one creator stands today: next step, who it waits on and since when, and the deadline that applies. */
export function entryStatus(e: Entry, c: Campaign, today: string) {
  const done = doneList(e);
  const next = done.findIndex((d) => !d);
  const doneCount = done.filter(Boolean).length;
  const last = done.filter((d): d is string => !!d).sort().at(-1) ?? e.addedAt;
  // The nearest deadline among steps not checked yet, so a passed 기획안 마감 shows even before 업로드 is close.
  const dues = dueList(e, c);
  const open = STEPS.map((s, i) => ({ i, label: s.label, date: done[i] ? null : dues[i] })).filter((d): d is { i: number; label: string; date: string } => !!d.date);
  const near = open.sort((a, b) => a.date.localeCompare(b.date) || a.i - b.i)[0];
  const deadline: Deadline | null = near ? { label: near.label, date: near.date, days: daysBetween(today, near.date) } : null;
  return {
    step: next === -1 ? "완료" : STEPS[next].label,
    finished: next === -1,
    doneCount,
    waitingOn: next === -1 ? null : STEPS[next].waits,
    waitingDays: next === -1 ? 0 : daysBetween(last, today),
    deadline,
    /** Red means a deadline has passed (기획자 피드백: 마감 기한이 지난 건은 빨간색). */
    overdue: !!deadline && deadline.days < 0,
  };
}

/** Campaign progress: checked steps over all steps of the creators still in it (dropped ones don't count). */
export function progress(entries: Entry[]) {
  const live = entries.filter((e) => !e.droppedAt);
  const checked = live.reduce((sum, e) => sum + doneList(e).filter(Boolean).length, 0);
  const pct = live.length ? Math.round((checked / (live.length * STEPS.length)) * 100) : 0;
  const finished = live.filter((e) => doneList(e).every(Boolean)).length;
  return { pct, finished, total: live.length };
}
