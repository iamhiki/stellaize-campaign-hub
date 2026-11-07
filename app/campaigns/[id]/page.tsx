import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageBand } from "@/components/PageBand";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ProgressBar } from "@/components/ProgressBar";
import { WAITING, OVERDUE_DAYS, DdayText } from "@/components/badges";
import { daysBetween, reportDue, todayKST } from "@/lib/date";
import { demo, type WaitingOn } from "@/lib/demo";

export default function CampaignPage(props: PageProps<"/campaigns/[id]">) {
  return (
    <Suspense fallback={null}>
      <Campaign {...props} />
    </Suspense>
  );
}

async function Campaign({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  await connection(); // "today" must be computed per request, not frozen at build time
  const today = todayKST();
  const campaign = demo(today).campaigns.find((c) => c.id === id);
  if (!campaign) notFound();
  const creators = campaign.creators;

  // Campaign-wide deadlines show once in 일정; a card only carries its own date (report due after upload).
  const cards = creators.map((cc) => ({
    cc,
    waitingDays: daysBetween(cc.waitingSince, today),
    dday: cc.stage === "업로드" && cc.uploadedAt ? { label: "리포트", days: daysBetween(today, reportDue(cc.uploadedAt)) } : null,
  }));

  const parties: WaitingOn[] = ["us", "advertiser", "creator"];
  const listDays = daysBetween(today, campaign.listDeadline);
  const uploadDays = daysBetween(today, campaign.desiredUpload);

  return (
    <>
      <PageBand
        title={
          <>
            {campaign.brand} {campaign.product}
            {campaign.confidential && <span className="border border-white px-1.5 py-0.5 text-[13px] font-semibold tracking-normal">대외비</span>}
          </>
        }
      >
        {campaign.advertiser} · {campaign.channel} · 예산 {campaign.budget} · 담당 {campaign.owners.join(", ")}
      </PageBand>

      <main className="mx-auto max-w-[1260px] px-5 md:px-[30px]">
        <section className="border-b border-line py-8">
          <h2 className="mb-3 text-[16px] font-bold text-ink-900">캠페인 진행률</h2>
          <ProgressBar size="lg" label={`${campaign.brand} ${campaign.product}`} stages={creators.map((cc) => cc.stage)} />
        </section>
        {/* Incross news bar: 4 equal columns split by 1px vertical lines */}
        <section className="grid grid-cols-2 gap-y-8 border-b border-line py-8 md:grid-cols-4 md:divide-x md:divide-line md:py-9">
          {parties.map((p) => {
            const list = cards.filter((c) => c.cc.waitingOn === p);
            const late = list.filter((c) => c.waitingDays >= OVERDUE_DAYS).length;
            return (
              <article key={p} className="pr-4 md:px-7 md:first:pl-0">
                <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
                  <span aria-hidden className={`size-2 ${WAITING[p].square}`} />
                  {WAITING[p].label}
                </h2>
                <p className="mt-4 text-[32px] font-bold leading-none tracking-[-0.03em] text-ink-900 tabular-nums">
                  {list.length}
                  <span className="ml-1 text-[16px] font-medium text-ink-600">건</span>
                </p>
                <p className="mt-3 truncate text-[15px] text-ink-600" title={list.map((c) => c.cc.name).join(", ")}>{list.map((c) => c.cc.name).join(", ") || "없음"}</p>
                {late > 0 && <p className="mt-1 text-[14px] font-semibold text-danger-700">{OVERDUE_DAYS}일 이상 대기 {late}건</p>}
              </article>
            );
          })}
          <article className="col-span-2 md:col-span-1 md:px-7">
            <h2 className="text-[16px] font-bold text-ink-900">일정</h2>
            <dl className="mt-4 space-y-2 text-[15px]">
              {[["리스트 마감", campaign.listDeadline, listDays], ["업로드 희망", campaign.desiredUpload, uploadDays]].map(([label, date, d]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-ink-600">{label}</dt>
                  <dd className="tabular-nums text-ink-800">
                    {date} <DdayText days={Number(d)} />
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="py-10 md:py-14">
          <h2 className="mb-6 text-[26px] md:mb-7 md:text-[32px] font-bold tracking-[-0.04em] text-ink-900">
            크리에이터 진행 현황 <span className="text-[18px] font-medium tracking-normal text-ink-600 tabular-nums">{creators.length}명</span>
          </h2>
          <KanbanBoard cards={cards} />
        </section>
      </main>
    </>
  );
}
