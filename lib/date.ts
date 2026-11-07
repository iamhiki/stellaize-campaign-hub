// Dates are "YYYY-MM-DD" strings (Supabase `date` columns). Both sides parse as UTC midnight, so differences are whole days.
const DAY = 86_400_000;

/** Today in Korea. Vercel servers run in UTC, so never slice `new Date()` directly. */
export const todayKST = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd) + n * DAY).toISOString().slice(0, 10);

export const STAGES = ["리스트업", "광고주 컨펌", "섭외·계약", "제작", "업로드", "완료"] as const;
export type Stage = (typeof STAGES)[number];

/** The report is due 14 days after upload. */
export const reportDue = (uploadedAt: string) => addDays(uploadedAt, 14);
