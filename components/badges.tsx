import type { WaitingOn } from "@/lib/demo";

export const OVERDUE_DAYS = 3; // waiting this long or more turns red. Team decides.
export const URGENT_DAYS = 1; // D-1, D-Day and past turn red; sooner-than-a-week is bold ink. Team decides.

// Incross-style status: a small square bullet + text, no pills. Square is the party color; red only for problems.
export const WAITING: Record<WaitingOn, { label: string; square: string }> = {
  us: { label: "우리 차례", square: "bg-primary-500" },
  advertiser: { label: "광고주 대기", square: "bg-party-advertiser" },
  creator: { label: "크리에이터 대기", square: "bg-party-creator" },
};

export function WaitingLine({ on, days }: { on: WaitingOn | null; days: number }) {
  if (!on) return <p className="text-[14px] text-ink-600">대기 없음</p>;
  const overdue = days >= OVERDUE_DAYS;
  return (
    <p className="flex items-center gap-1.5 text-[14px] font-medium text-ink-800">
      <span aria-hidden className={`size-2 shrink-0 ${WAITING[on].square}`} />
      {WAITING[on].label}
      {days > 0 && <span className={`tabular-nums ${overdue ? "font-bold text-danger-700" : "text-ink-600"}`}>{days}일째</span>}
    </p>
  );
}

export function DdayText({ days }: { days: number }) {
  const text = days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${-days}`;
  return <b className={`ml-1 tabular-nums ${days <= URGENT_DAYS ? "text-danger-700" : "text-ink-900"}`}>{text}</b>;
}

export function DdayLine({ label, days }: { label: string; days: number }) {
  return (
    <p className="text-[14px] text-ink-600">
      {label}
      <DdayText days={days} />
    </p>
  );
}
