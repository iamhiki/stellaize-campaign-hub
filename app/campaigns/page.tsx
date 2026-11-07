import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PageBand, pageWrap, table } from "@/components/PageBand";
import { WAITING } from "@/components/badges";
import { progressPct, todayKST } from "@/lib/date";
import { demo, type WaitingOn } from "@/lib/demo";

export const metadata = { title: "캠페인 │ Campaign Hub │ 스텔라이즈" };

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <Campaigns />
    </Suspense>
  );
}

const PARTIES: WaitingOn[] = ["us", "advertiser", "creator"];

async function Campaigns() {
  await connection();
  const { campaigns } = demo(todayKST());
  const done = (c: (typeof campaigns)[number]) => c.creators.every((cc) => cc.stage === "완료" || cc.stage === "업로드");

  return (
    <>
      <PageBand title="캠페인">
        진행 중인 캠페인 {campaigns.length}개입니다. 캠페인을 누르면 크리에이터별 진행 보드가 열립니다. 여러 캠페인에서 오늘 처리할 건만 보려면{" "}
        <Link href="/today" className="underline underline-offset-4">
          오늘 할 일
        </Link>
        로 가세요.
      </PageBand>
      <main className={`${pageWrap} py-10 md:py-14`}>
        <div className="overflow-x-auto">
          <table className={table.wrap}>
            <thead>
              <tr>
                {["캠페인", "진행률", "광고주", "채널", "대기", "리스트 마감", "업로드 희망", "담당"].map((h) => (
                  <th key={h} className={table.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const pct = progressPct(c.creators.map((cc) => cc.stage));
                const finished = c.creators.filter((cc) => cc.stage === "완료").length;
                return (
                <tr key={c.id} className="hover:bg-[#f5f7fa]">
                  <td className={table.td}>
                    <Link href={`/campaigns/${c.id}`} className="text-[16px] font-bold text-ink-900 underline-offset-4 hover:text-primary-600 hover:underline">
                      {c.brand} {c.product}
                    </Link>
                    <span className="mt-1 flex gap-1.5 text-[13px] font-semibold text-ink-600">
                      {done(c) ? "마무리 단계" : "진행 중"}
                      {c.confidential && <span className="border border-line px-1">대외비</span>}
                    </span>
                  </td>
                  <td className={`${table.td} w-[200px]`}>
                    <p className="flex items-baseline justify-between">
                      <b className="text-[20px] tracking-[-0.02em] text-ink-900 tabular-nums">{pct}%</b>
                      <span className="text-[13px] text-ink-600 tabular-nums">
                        완료 {finished}/{c.creators.length}명
                      </span>
                    </p>
                    <div
                      role="progressbar"
                      aria-label={`${c.brand} ${c.product} 진행률`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="mt-2 h-1.5 bg-line"
                    >
                      <div className="grow-x h-full bg-primary-600" style={{ width: `${pct}%`, "--delay": `${200 + i * 120}ms` } as React.CSSProperties} />
                    </div>
                  </td>
                  <td className={table.td}>{c.advertiser}</td>
                  <td className={table.td}>{c.channel}</td>
                  <td className={table.td}>
                    <ul className="flex flex-col gap-1 text-[14px]">
                      {PARTIES.map((p) => {
                        const n = c.creators.filter((cc) => cc.waitingOn === p).length;
                        return n > 0 ? (
                          <li key={p} className="flex items-center gap-1.5 whitespace-nowrap">
                            <span aria-hidden className={`size-2 ${WAITING[p].square}`} />
                            {WAITING[p].label} <b className="tabular-nums">{n}</b>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </td>
                  <td className={`${table.td} tabular-nums`}>{c.listDeadline}</td>
                  <td className={`${table.td} tabular-nums`}>{c.desiredUpload}</td>
                  <td className={table.td}>{c.owners.join(", ")}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
