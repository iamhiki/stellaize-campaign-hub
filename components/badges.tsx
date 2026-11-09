import type { Deadline, WaitingOn } from "@/lib/campaigns";

export const FOLLOW_UP_DAYS = 3; // no reply this long shows 답변 독촉 (and 드랍 for creators). Team decides.
export const SOON_DAYS = 7; // deadlines within a week are bold ink; only a passed deadline is red (팀장 피드백 11/7).

// Incross-style status: a small square bullet + text, no pills. Square is the party color; red only for problems.
export const WAITING: Record<WaitingOn, { label: string; square: string }> = {
  us: { label: "우리 차례", square: "bg-primary-500" },
  advertiser: { label: "광고주 대기", square: "bg-party-advertiser" },
  creator: { label: "크리에이터 대기", square: "bg-party-creator" },
};

export function WaitingLine({ on, days }: { on: WaitingOn | null; days: number }) {
  if (!on) return <p className="text-[14px] text-ink-600">대기 없음</p>;
  return (
    <p className="flex items-center gap-1.5 whitespace-nowrap text-[14px] font-medium text-ink-800">
      <span aria-hidden className={`size-2 shrink-0 ${WAITING[on].square}`} />
      {WAITING[on].label}
      {days > 0 && <span className="tabular-nums text-ink-600">{days}일째</span>}
    </p>
  );
}

export function DdayText({ days }: { days: number }) {
  const text = days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${-days}`;
  const tone = days < 0 ? "text-danger-700" : days <= SOON_DAYS ? "text-ink-900" : "font-semibold text-ink-600";
  return <b className={`ml-1 tabular-nums ${tone}`}>{text}{days < 0 && " 지남"}</b>;
}

export function DeadlineLine({ deadline }: { deadline: Deadline | null }) {
  if (!deadline) return <p className="text-[14px] text-ink-600">마감 없음</p>;
  return (
    <p className="whitespace-nowrap text-[14px] text-ink-600">
      {deadline.label}
      <DdayText days={deadline.days} />
    </p>
  );
}
