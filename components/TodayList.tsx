"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Loading, pageWrap, table } from "./PageBand";
import { WaitingLine, DdayText } from "./badges";
import { LateDrop, canDrop } from "./FollowUp";
import { entryStatus, type WaitingOn } from "@/lib/campaigns";
import { useMe } from "@/lib/me";
import { useCampaigns, useToday } from "@/lib/store";

type Bucket = { key: string; label: string; hint: string };
type TodayRow = {
  entryId: string;
  kind: string;
  creator: string;
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

// Three buckets across campaigns (기획자 피드백 11/7: 리스트업 제외, 마감이 지난 건이 먼저; 11/13: 회신 3일 기준 삭제).
const BUCKETS: Bucket[] = [
  { key: "overdue", label: "마감 지남", hint: "단계별 마감, 업로드 날짜, 리포트 마감이 지난 건" },
  { key: "report", label: "리포트 작성", hint: `리포트 마감(기본 업로드 후 14일) ${SOON}일 안` },
  { key: "confirm", label: "컨펌 대기", hint: "광고주 컨펌을 기다리는 건" },
];

export function TodayList() {
  const campaigns = useCampaigns();
  const [scope, setScope] = useState<Scope>("mine");
  const [sort, setSort] = useState<Sort>("kind");
  const [only, setOnly] = useState<string | null>(null); // a bucket card narrows the list to that kind
  const listRef = useRef<HTMLElement>(null);
  const today = useToday();
  const buckets = BUCKETS;
  const userName = useMe()?.name ?? "";

  const all: TodayRow[] = [];
  for (const c of campaigns ?? []) {
    const mine = c.owners.includes(userName);
    for (const e of c.entries) {
      if (e.droppedAt) continue;
      const s = entryStatus(e, c, today);
      const base = { entryId: e.id, creator: e.name, campaignId: c.id, campaign: c.name, mine, waitingOn: s.waitingOn, waitingDays: s.waitingDays };
      if (s.overdue) all.push({ ...base, kind: "overdue", due: s.deadline });
      else if (s.deadline?.label === "리포트 작성" && s.deadline.days <= SOON) all.push({ ...base, kind: "report", due: s.deadline });
      if (s.waitingOn === "advertiser") all.push({ ...base, kind: "confirm", due: s.deadline });
    }
  }

  const order = buckets.map((b) => b.key);
  const rows = all
    .filter((r) => scope === "all" || r.mine)
    .sort((a, b) => (sort === "waiting" ? b.waitingDays - a.waitingDays : order.indexOf(a.kind) - order.indexOf(b.kind)));
  const labelOf = Object.fromEntries(buckets.map((b) => [b.key, b.label]));
  const shown = only ? rows.filter((r) => r.kind === only) : rows;
  const pick = (key: string) => {
    const next = only === key ? null : key;
    setOnly(next);
    if (next) listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className={pageWrap}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-5">
        <Toggle label="범위" value={scope} onChange={setScope} options={[["mine", userName ? `${userName} 님 담당` : "내 담당"], ["all", "전체"]]} />
        <Toggle label="정렬" value={sort} onChange={setSort} options={[["kind", "구분순"], ["waiting", "대기일순"]]} />
      </div>

      <section className="grid grid-cols-2 gap-y-8 border-b border-line py-8 md:grid-cols-3 md:divide-x md:divide-line md:py-9">
        {buckets.map((b) => (
          <button
            key={b.key}
            type="button"
            aria-pressed={only === b.key}
            onClick={() => pick(b.key)}
            className="group pr-4 text-left hover:bg-[#f5f7fa] aria-pressed:bg-primary-100 md:px-7 md:first:pl-0 md:aria-pressed:first:pl-7"
          >
            <span className="block text-[16px] font-bold text-ink-900 group-hover:text-primary-600">
              {b.label}
              <span className="ml-1 text-[13px] font-medium text-ink-600">{only === b.key ? "· 보는 중" : "목록 보기 ›"}</span>
            </span>
            <span className="mt-4 block text-[32px] font-bold leading-none tracking-[-0.03em] text-ink-900 tabular-nums">
              {rows.filter((r) => r.kind === b.key).length}
              <span className="ml-1 text-[16px] font-medium text-ink-600">건</span>
            </span>
            <span className="mt-3 block text-[14px] text-ink-600">{b.hint}</span>
          </button>
        ))}
      </section>

      <section ref={listRef} className="scroll-mt-4 py-10 md:py-14">
        <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 md:mb-7">
          <h2 className="text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:text-[32px]">
            {only ? labelOf[only] : "처리할 건"} <span className="text-[18px] font-medium tracking-normal text-ink-600 tabular-nums">{shown.length}건</span>
          </h2>
          {only && (
            <button type="button" onClick={() => setOnly(null)} className="min-h-9 text-[14px] text-ink-600 underline underline-offset-4 hover:text-primary-600">
              전체 보기
            </button>
          )}
        </div>
        {!campaigns ? (
          <Loading />
        ) : shown.length === 0 ? (
          <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">{only ? `${labelOf[only]} 건이 없습니다.` : "오늘 처리할 건이 없습니다."}</p>
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
                {shown.map((r) => (
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
                          <span className="text-ink-600">{r.due.label} 마감</span>
                          <DdayText days={r.due.days} />
                        </>
                      ) : (
                        <span className="text-ink-600">—</span>
                      )}
                    </td>
                    <td className={table.td}>
                      {canDrop(r.waitingOn) ? (
                        // pulled into the text line so rows with and without the button are the same height
                        <div className="-my-1.5"><LateDrop campaignId={r.campaignId} entryId={r.entryId} name={r.creator} waitingOn={r.waitingOn} /></div>
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
