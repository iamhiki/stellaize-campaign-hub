import type { WaitingOn } from "@/lib/demo";

export const OVERDUE_DAYS = 3; // waiting this long or more turns red. Team decides.
export const URGENT_DAYS = 3; // a deadline this close or past turns red. Team decides.

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

export function DdayLine({ label, days }: { label: string; days: number }) {
  const text = days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${-days}`;
  const urgent = days <= URGENT_DAYS;
  return (
    <p className="text-[14px] text-ink-600">
      {label} <span className={`tabular-nums font-semibold ${urgent ? "text-danger-700" : "text-ink-800"}`}>{text}</span>
    </p>
  );
}
