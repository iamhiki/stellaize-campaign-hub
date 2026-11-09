"use client";
import { useState } from "react";
import Link from "next/link";
import { Loading, pageWrap, table } from "./PageBand";
import { WaitingLine, DdayText, FOLLOW_UP_DAYS } from "./badges";
import { FollowUp, needsFollowUp } from "./FollowUp";
import { entryStatus, type WaitingOn } from "@/lib/campaigns";
import { CURRENT_USER } from "@/lib/demo";
import { useCampaigns, useToday } from "@/lib/store";

type Bucket = { key: string; label: string; hint: string };
type TodayRow = {
  entryId: string;
  kind: string;
  creator: string;
  remindedAt: string | null;
  campaignId: string;
  campaign: string;
  mine: boolean;
  waitingOn: WaitingOn | null;
  waitingDays: number;
  due: { label: string; days: number } | null;
};

type Scope = "mine" | "all";
type Sort = "kind" | "waiting";

// Linear-style controls: a segmented scope switch and a sort switch, both plain buttons with aria-pressed.
function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex border border-line">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className="min-h-10 px-4 text-[14px] font-semibold text-ink-800 hover:text-primary-600 aria-pressed:bg-ink-900 aria-pressed:text-white"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const SOON = 3; // a report due this many days out or closer counts as today's work

// Four buckets across campaigns (팀장 피드백 11/7: 리스트업 제외, 마감이 지난 건이 먼저).
const BUCKETS: Bucket[] = [
  { key: "overdue", label: "마감 지남", hint: "업로드 날짜나 리포트 마감이 지난 건" },
  { key: "report", label: "리포트 작성", hint: `업로드 후 14일 마감 ${SOON}일 안` },
  { key: "chase", label: "답변 독촉", hint: `크리에이터·광고주 회신 ${FOLLOW_UP_DAYS}일 이상 없음` },
  { key: "confirm", label: "컨펌 대기", hint: "광고주 컨펌을 기다리는 건" },
];

export function TodayList() {
  const campaigns = useCampaigns();
  const [scope, setScope] = useState<Scope>("mine");
  const [sort, setSort] = useState<Sort>("kind");
  const today = useToday();
  const buckets = BUCKETS;
  const userName = CURRENT_USER.name;

  const all: TodayRow[] = [];
  for (const c of campaigns ?? []) {
    const mine = c.owners.includes(userName);
    for (const e of c.entries) {
      if (e.droppedAt) continue;
      const s = entryStatus(e, c, today);
      const base = { entryId: e.id, creator: e.name, remindedAt: e.remindedAt, campaignId: c.id, campaign: c.name, mine, waitingOn: s.waitingOn, waitingDays: s.waitingDays };
      if (s.overdue) all.push({ ...base, kind: "overdue", due: s.deadline });
      else if (s.deadline?.label === "리포트" && s.deadline.days <= SOON) all.push({ ...base, kind: "report", due: s.deadline });
      if (needsFollowUp(s.waitingOn, s.waitingDays)) all.push({ ...base, kind: "chase", due: s.deadline });
      else if (s.waitingOn === "advertiser") all.push({ ...base, kind: "confirm", due: s.deadline });
    }
  }

  const order = buckets.map((b) => b.key);
  const rows = all
    .filter((r) => scope === "all" || r.mine)
    .sort((a, b) => (sort === "waiting" ? b.waitingDays - a.waitingDays : order.indexOf(a.kind) - order.indexOf(b.kind)));
  const labelOf = Object.fromEntries(buckets.map((b) => [b.key, b.label]));

  return (
    <main className={pageWrap}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-5">
        <Toggle label="범위" value={scope} onChange={setScope} options={[["mine", `${userName} 님 담당`], ["all", "전체"]]} />
        <Toggle label="정렬" value={sort} onChange={setSort} options={[["kind", "구분순"], ["waiting", "대기일순"]]} />
      </div>

      <section className="grid grid-cols-2 gap-y-8 border-b border-line py-8 md:grid-cols-4 md:divide-x md:divide-line md:py-9">
        {buckets.map((b) => (
          <article key={b.key} className="pr-4 md:px-7 md:first:pl-0">
            <h2 className="text-[16px] font-bold text-ink-900">{b.label}</h2>
            <p className="mt-4 text-[32px] font-bold leading-none tracking-[-0.03em] text-ink-900 tabular-nums">
              {rows.filter((r) => r.kind === b.key).length}
              <span className="ml-1 text-[16px] font-medium text-ink-600">건</span>
            </p>
            <p className="mt-3 text-[14px] text-ink-600">{b.hint}</p>
          </article>
        ))}
      </section>

      <section className="py-10 md:py-14">
        <h2 className="mb-6 text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:mb-7 md:text-[32px]">
          처리할 건 <span className="text-[18px] font-medium tracking-normal text-ink-600 tabular-nums">{rows.length}건</span>
        </h2>
        {!campaigns ? (
          <Loading />
        ) : rows.length === 0 ? (
          <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">오늘 처리할 건이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={table.wrap}>
              <thead>
                <tr>
                  {["구분", "크리에이터", "캠페인", "상태", "기한", "처리"].map((h) => (
                    <th key={h} className={table.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.entryId}`}>
                    <td className={`${table.td} font-semibold text-ink-900`}>{labelOf[r.kind]}</td>
                    <td className={table.td}>{r.creator}</td>
                    <td className={table.td}>
                      <Link href={`/campaigns/${r.campaignId}`} className="font-medium text-ink-900 underline-offset-4 hover:text-primary-600 hover:underline">
                        {r.campaign}
                      </Link>
                    </td>
                    <td className={table.td}>
                      <WaitingLine on={r.waitingOn} days={r.waitingDays} />
                    </td>
                    <td className={`${table.td} whitespace-nowrap`}>
                      {r.due ? (
                        <>
                          <span className="text-ink-600">{r.due.label}</span>
                          <DdayText days={r.due.days} />
                        </>
                      ) : (
                        <span className="text-ink-600">—</span>
                      )}
                    </td>
                    <td className={table.td}>
                      {needsFollowUp(r.waitingOn, r.waitingDays) ? (
                        <FollowUp campaignId={r.campaignId} entryId={r.entryId} name={r.creator} waitingOn={r.waitingOn} days={r.waitingDays} remindedAt={r.remindedAt} />
                      ) : (
                        <span className="text-ink-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
