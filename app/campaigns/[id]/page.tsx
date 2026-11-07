import { Suspense } from "react";
import { connection } from "next/server";
import { SiteHeader } from "@/components/SiteHeader";
import { KanbanBoard } from "@/components/KanbanBoard";
import { WAITING, OVERDUE_DAYS, URGENT_DAYS } from "@/components/badges";
import { daysBetween, ddayTarget, todayKST } from "@/lib/date";
import { demo, type WaitingOn } from "@/lib/demo";

export default function CampaignPage(props: PageProps<"/campaigns/[id]">) {
  return (
    <Suspense fallback={null}>
      <Campaign {...props} />
    </Suspense>
  );
}

const dday = (days: number) => (days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${-days}`);

async function Campaign({ params }: PageProps<"/campaigns/[id]">) {
  await params; // shortcut: every id shows the demo campaign until Supabase is wired
  await connection(); // "today" must be computed per request, not frozen at build time
  const today = todayKST();
  const { campaign, creators } = demo(today);

  const cards = creators.map((cc) => {
    const t = ddayTarget(cc.stage, { listDeadline: campaign.listDeadline, desiredUpload: campaign.desiredUpload, uploadedAt: cc.uploadedAt });
    return { cc, waitingDays: daysBetween(cc.waitingSince, today), dday: t && { label: t.label, days: daysBetween(today, t.date) } };
  });

  const parties: WaitingOn[] = ["us", "advertiser", "creator"];
  const listDays = daysBetween(today, campaign.listDeadline);
  const uploadDays = daysBetween(today, campaign.desiredUpload);

  return (
    <>
      {/* Incross hero layout; background is the Stellaize brand gradient, dark end on the text side for contrast */}
      <section className="relative bg-[linear-gradient(103deg,#1876d6_0%,#0072ff_55%,#40bfff_100%)] text-white">
        <SiteHeader userName="김하늘 님" />
        <div className="mx-auto max-w-[1260px] px-[30px] pb-16 pt-[160px]">
          <p className="text-[16px] font-semibold">
            캠페인 · {campaign.advertiser}
            {campaign.confidential && <span className="ml-3 border border-white px-1.5 py-0.5 text-[13px]">대외비</span>}
          </p>
          <h1 className="mt-4 text-[52px] font-bold leading-tight tracking-[-0.04em]">
            {campaign.brand} {campaign.product}
          </h1>
          <p className="mt-4 text-[18px] font-medium">
            {campaign.channel} · 예산 {campaign.budget} · 담당 {campaign.owners.join(", ")}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1260px] px-[30px]">
        {/* Incross news bar: 4 equal columns split by 1px vertical lines */}
        <section className="grid grid-cols-4 divide-x divide-line border-b border-line py-9">
          {parties.map((p) => {
            const list = cards.filter((c) => c.cc.waitingOn === p);
            const late = list.filter((c) => c.waitingDays >= OVERDUE_DAYS).length;
            return (
              <article key={p} className="px-7 first:pl-0">
                <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
                  <span aria-hidden className={`size-2 ${WAITING[p].square}`} />
                  {WAITING[p].label}
                </h2>
                <p className="mt-4 text-[32px] font-bold leading-none tracking-[-0.03em] text-ink-900 tabular-nums">
                  {list.length}
                  <span className="ml-1 text-[16px] font-medium text-ink-600">건</span>
                </p>
                <p className="mt-3 truncate text-[15px] text-ink-600">{list.map((c) => c.cc.name).join(", ") || "없음"}</p>
                {late > 0 && <p className="mt-1 text-[14px] font-semibold text-danger-700">{OVERDUE_DAYS}일 이상 대기 {late}건</p>}
              </article>
            );
          })}
          <article className="px-7">
            <h2 className="text-[16px] font-bold text-ink-900">일정</h2>
            <dl className="mt-4 space-y-2 text-[15px]">
              {[["리스트 마감", campaign.listDeadline, listDays], ["업로드 희망", campaign.desiredUpload, uploadDays]].map(([label, date, d]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-ink-600">{label}</dt>
                  <dd className="tabular-nums text-ink-800">
                    {date} <b className={`ml-1 ${Number(d) <= URGENT_DAYS ? "text-danger-700" : "text-ink-900"}`}>{dday(Number(d))}</b>
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="py-14">
          <h2 className="mb-7 text-[32px] font-bold tracking-[-0.04em] text-ink-900">
            크리에이터 진행 현황 <span className="text-[18px] font-medium tracking-normal text-ink-600 tabular-nums">{creators.length}명</span>
          </h2>
          <KanbanBoard cards={cards} />
        </section>
      </main>
    </>
  );
}
