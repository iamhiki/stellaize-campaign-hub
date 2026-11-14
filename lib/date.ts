// Dates are "YYYY-MM-DD" strings (Supabase `date` columns). Both sides parse as UTC midnight, so differences are whole days.
const DAY = 86_400_000;

/** Today in Korea. Vercel servers run in UTC, so never slice `new Date()` directly. */
export const todayKST = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
export const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd) + n * DAY).toISOString().slice(0, 10);

/** The report is due 14 days after upload. */
export const reportDue = (uploadedAt: string) => addDays(uploadedAt, 14);

/** A deadline reminder goes out this many days before the deadline (11/14: 마감 전에 알린다). */
export const REMIND_DAYS = 1;
/** Whether a step due on `due` should be reminded about today: from REMIND_DAYS before the deadline onward. */
export const remindNow = (today: string, due: string) => daysBetween(today, due) <= REMIND_DAYS;
/** "마감이 내일(11/19)입니다" and its variants, for a deadline `days` away (negative = passed). `md` is the date as "11/19". */
export const dueWords = (days: number, md: string) =>
  days < 0 ? `마감(${md})이 지났습니다` : `마감이 ${days === 0 ? "오늘" : days === 1 ? "내일" : `${days}일 뒤`}(${md})입니다`;
