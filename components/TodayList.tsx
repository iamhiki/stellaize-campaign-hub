"use client";
import { useState } from "react";
import Link from "next/link";
import { pageWrap, table } from "./PageBand";
import { WaitingLine, DdayText, OVERDUE_DAYS } from "./badges";
import { DropButton } from "./DropButton";
import { useDropped } from "@/lib/dropped";
import type { WaitingOn } from "@/lib/demo";

export type Bucket = { key: string; label: string; hint: string };
export type TodayRow = {
  entryId: string | null; // campaign-creator id; null for campaign-wide rows
  kind: string;
  creator: string | null;
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

export function TodayList({ buckets, rows: all, userName }: { buckets: Bucket[]; rows: TodayRow[]; userName: string }) {
  const [scope, setScope] = useState<Scope>("mine");
  const [sort, setSort] = useState<Sort>("kind");
  const { dropped, drop } = useDropped();

  const order = buckets.map((b) => b.key);
  const rows = all
    .filter((r) => (scope === "all" || r.mine) && !(r.entryId && dropped.has(r.entryId)))
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
        {rows.length === 0 ? (
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
                {rows.map((r, i) => (
                  <tr key={`${r.kind}-${r.entryId ?? r.campaignId}-${i}`}>
                    <td className={`${table.td} font-semibold text-ink-900`}>{labelOf[r.kind]}</td>
                    <td className={table.td}>{r.creator ?? "—"}</td>
                    <td className={table.td}>
                      <Link href={`/campaigns/${r.campaignId}`} className="font-medium text-ink-900 underline-offset-4 hover:text-primary-600 hover:underline">
                        {r.campaign}
                      </Link>
                    </td>
                    <td className={table.td}>{r.creator ? <WaitingLine on={r.waitingOn} days={r.waitingDays} /> : <span className="text-ink-600">캠페인 전체</span>}</td>
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
                      {r.kind === "drop" && r.entryId && r.creator ? (
                        <DropButton name={r.creator} onDrop={() => drop(r.entryId!)} />
                      ) : r.kind === "confirm" && r.waitingDays >= OVERDUE_DAYS ? (
                        <span className="font-semibold text-danger-700">답변 독촉</span>
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
