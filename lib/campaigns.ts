import { daysBetween, reportDue } from "./date";

// shortcut: no Supabase yet. Campaigns live in this browser (lib/store.ts); these are the shapes and the rules.
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
  remindedAt: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  advertiser: string;
  channel: string;
  uploadDate: string;
  owners: string[];
  createdAt: string;
  entries: Entry[];
};

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
