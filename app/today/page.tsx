import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PageBand, pageWrap, table } from "@/components/PageBand";
import { WaitingLine, DdayText, OVERDUE_DAYS } from "@/components/badges";
import { daysBetween, reportDue, todayKST } from "@/lib/date";
import { CURRENT_USER, demo } from "@/lib/demo";

export const metadata = { title: "오늘 할 일 │ Campaign Hub │ 스텔라이즈" };

export default function TodayPage() {
  return (
    <Suspense fallback={null}>
      <Today />
    </Suspense>
  );
}

const SOON = 3; // deadlines this many days out or closer count as "today's work"

type Row = { kind: string; creator: string; campaignId: string; campaign: string; waitingOn: Parameters<typeof WaitingLine>[0]["on"]; waitingDays: number; due: { label: string; days: number } | null };

async function Today() {
  await connection();
  const today = todayKST();
  const mine = demo(today).campaigns.filter((c) => c.owners.includes(CURRENT_USER.name));

  // README MVP 6: four buckets across every campaign I own.
  const buckets: { key: string; label: string; hint: string; rows: Row[] }[] = [
    { key: "drop", label: "드랍 후보", hint: `리스트 마감 ${SOON}일 안, 단가 회신 없음`, rows: [] },
    { key: "report", label: "리포트 작성", hint: `업로드 후 14일 마감 ${SOON}일 안`, rows: [] },
    { key: "deadline", label: "리스트 마감 임박", hint: `리스트 마감 ${SOON}일 안`, rows: [] },
    { key: "confirm", label: "컨펌 대기", hint: "광고주 회신을 기다리는 건", rows: [] },
  ];
  const [drop, report, deadline, confirm] = buckets;

  for (const c of mine) {
    const name = `${c.brand} ${c.product}`;
    const listDays = daysBetween(today, c.listDeadline);
    const listOpen = c.creators.some((cc) => cc.stage === "리스트업" || cc.stage === "광고주 컨펌");
    for (const cc of c.creators) {
      const base = { creator: cc.name, campaignId: c.id, campaign: name, waitingOn: cc.waitingOn, waitingDays: daysBetween(cc.waitingSince, today) };
      if (cc.stage === "리스트업" && cc.waitingOn === "creator" && listDays <= SOON)
        drop.rows.push({ ...base, kind: drop.label, due: { label: "리스트 마감", days: listDays } });
      const reportDone = cc.checklist.find((i) => i.label === "리포트 작성 완료")?.done;
      if (cc.stage === "업로드" && cc.uploadedAt && !reportDone) {
        const days = daysBetween(today, reportDue(cc.uploadedAt));
        if (days <= SOON) report.rows.push({ ...base, kind: report.label, due: { label: "리포트", days } });
      }
      if (cc.waitingOn === "advertiser") confirm.rows.push({ ...base, kind: confirm.label, due: null });
    }
    if (listOpen && listDays >= 0 && listDays <= SOON)
      deadline.rows.push({ kind: deadline.label, creator: "—", campaignId: c.id, campaign: name, waitingOn: null, waitingDays: 0, due: { label: "리스트 마감", days: listDays } });
  }

  const rows = buckets.flatMap((b) => b.rows);

  return (
    <>
      <PageBand title="오늘 할 일">
        {CURRENT_USER.name} 님이 맡은 캠페인 {mine.length}개에서 오늘 처리할 건만 모았습니다. 캠페인 하나를 자세히 보려면{" "}
        <Link href="/campaigns" className="underline underline-offset-4">
          캠페인
        </Link>
        으로 가세요.
      </PageBand>
      <main className={pageWrap}>
        <section className="grid grid-cols-2 gap-y-8 border-b border-line py-8 md:grid-cols-4 md:divide-x md:divide-line md:py-9">
          {buckets.map((b) => (
            <article key={b.key} className="pr-4 md:px-7 md:first:pl-0">
              <h2 className="text-[16px] font-bold text-ink-900">{b.label}</h2>
              <p className="mt-4 text-[32px] font-bold leading-none tracking-[-0.03em] text-ink-900 tabular-nums">
                {b.rows.length}
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
                    {["구분", "크리에이터", "캠페인", "상태", "기한"].map((h) => (
                      <th key={h} className={table.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className={`${table.td} font-semibold text-ink-900`}>{r.kind}</td>
                      <td className={table.td}>{r.creator}</td>
                      <td className={table.td}>
                        <Link href={`/campaigns/${r.campaignId}`} className="font-medium text-ink-900 underline-offset-4 hover:text-primary-600 hover:underline">
                          {r.campaign}
                        </Link>
                      </td>
                      <td className={table.td}>{r.creator === "—" ? <span className="text-ink-600">캠페인 전체</span> : <WaitingLine on={r.waitingOn} days={r.waitingDays} />}</td>
                      <td className={`${table.td} whitespace-nowrap`}>
                        {r.due ? (
                          <>
                            <span className="text-ink-600">{r.due.label}</span>
                            <DdayText days={r.due.days} />
                          </>
                        ) : r.waitingDays >= OVERDUE_DAYS ? (
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
    </>
  );
}
