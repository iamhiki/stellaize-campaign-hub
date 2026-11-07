// Dates are "YYYY-MM-DD" strings (Supabase `date` columns). Both sides parse as UTC midnight, so differences are whole days.
const DAY = 86_400_000;

/** Today in Korea. Vercel servers run in UTC, so never slice `new Date()` directly. */
export const todayKST = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd) + n * DAY).toISOString().slice(0, 10);

export const STAGES = ["리스트업", "광고주 컨펌", "섭외·계약", "제작", "업로드", "완료"] as const;
export type Stage = (typeof STAGES)[number];

export type DdayDates = { listDeadline: string; desiredUpload: string; uploadedAt: string | null };

/** Which date a card counts down to depends on its stage. */
export function ddayTarget(stage: Stage, d: DdayDates): { label: string; date: string } | null {
  switch (stage) {
    case "리스트업":
    case "광고주 컨펌":
      return { label: "리스트 마감", date: d.listDeadline };
    case "섭외·계약":
    case "제작":
      return { label: "업로드", date: d.desiredUpload };
    case "업로드":
      return d.uploadedAt ? { label: "리포트", date: addDays(d.uploadedAt, 14) } : { label: "업로드", date: d.desiredUpload };
    case "완료":
      return null;
  }
}
