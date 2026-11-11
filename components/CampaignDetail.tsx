"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { entryStatus, type WaitingOn } from "@/lib/campaigns";
import { daysBetween, reportDue } from "@/lib/date";
import { addEntry, deleteCampaign, useCampaigns, useToday } from "@/lib/store";
import { DdayText, WAITING } from "./badges";
import { CreatorTable } from "./CreatorTable";
import { Loading, PageBand, pageWrap, ui } from "./PageBand";
import { ProgressBar } from "./ProgressBar";

const PARTIES: WaitingOn[] = ["us", "advertiser", "creator"];

export function CampaignDetail({ id }: { id: string }) {
  const campaigns = useCampaigns();
  const router = useRouter();
  const today = useToday();
  const campaign = campaigns?.find((c) => c.id === id);

  if (!campaigns) {
    return (
      <>
        <PageBand title="캠페인" />
        <main className={`${pageWrap} py-10`}>
          <Loading />
        </main>
      </>
    );
  }
  if (!campaign) {
    return (
      <>
        <PageBand title="캠페인을 찾을 수 없습니다" />
        <main className={`${pageWrap} py-12`}>
          <p className="text-[17px] text-ink-800">삭제된 캠페인이거나 주소가 잘못됐습니다.</p>
          <Link href="/campaigns" className={`${ui.primary} mt-8`}>
            캠페인 목록으로
          </Link>
        </main>
      </>
    );
  }

  const live = campaign.entries.filter((e) => !e.droppedAt);
  const statuses = live.map((e) => ({ e, s: entryStatus(e, campaign, today) }));
  const late = statuses.filter((x) => x.s.overdue);

  return (
    <>
      <PageBand title={campaign.name}>
        {campaign.advertiser} · {campaign.channel} · 기본 업로드 {campaign.uploadDate} · 담당 {campaign.owners.join(", ")}
      </PageBand>

      <main className={pageWrap}>
        {/* 기획자 피드백 11/7: 크리에이터 리스트가 제일 위 */}
        <section className="py-10 md:py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:text-[32px]">
              크리에이터 진행 현황 <span className="text-[18px] font-medium tracking-normal text-ink-600 tabular-nums">{live.length}명</span>
            </h2>
            <AddCreator campaignId={campaign.id} />
          </div>
          <CreatorTable campaign={campaign} today={today} />
        </section>

        <section aria-label="캠페인 요약" className="grid grid-cols-2 gap-y-8 border-t border-line py-8 md:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr] md:divide-x md:divide-line md:py-9">
          <article className="col-span-2 pr-4 md:col-span-1 md:pr-7">
            <h2 className="mb-3 text-[16px] font-bold text-ink-900">캠페인 진행률</h2>
            <ProgressBar size="lg" label={campaign.name} entries={campaign.entries} />
            {late.length > 0 && <p className="mt-3 text-[14px] font-semibold text-danger-700">마감 지남 {late.length}건: {late.map((x) => x.e.name).join(", ")}</p>}
          </article>
          {PARTIES.map((p) => {
            const list = statuses.filter((x) => x.s.waitingOn === p);
            return (
              <article key={p} className="pr-4 md:px-7">
                <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
                  <span aria-hidden className={`size-2 ${WAITING[p].square}`} />
                  {WAITING[p].label}
                </h2>
                <p className="mt-4 text-[32px] font-bold leading-none tracking-[-0.03em] text-ink-900 tabular-nums">
                  {list.length}
                  <span className="ml-1 text-[16px] font-medium text-ink-600">건</span>
                </p>
                <p className="mt-3 truncate text-[15px] text-ink-600" title={list.map((x) => x.e.name).join(", ")}>
                  {list.map((x) => x.e.name).join(", ") || "없음"}
                </p>
              </article>
            );
          })}
          <article className="col-span-2 md:col-span-1 md:pl-7">
            <h2 className="text-[16px] font-bold text-ink-900">일정</h2>
            <dl className="mt-4 space-y-2 text-[15px]">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-600">등록</dt>
                <dd className="tabular-nums text-ink-800">{campaign.createdAt}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-600">기본 업로드</dt>
                <dd className="tabular-nums text-ink-800">
                  {campaign.uploadDate}
                  <DdayText days={daysBetween(today, campaign.uploadDate)} />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-600">리포트 마감</dt>
                <dd className="text-right text-ink-800">업로드 후 14일</dd>
              </div>
            </dl>
            <p className="mt-3 text-[13px] text-ink-600">
              업로드 날짜와 단계별 마감은 크리에이터마다 &lsquo;마감 설정&rsquo;에서 정합니다. 리포트 마감은 따로 정하지 않으면 업로드를 체크한 날부터 14일(기본 업로드 기준 {reportDue(campaign.uploadDate)})입니다.
            </p>
          </article>
        </section>

        <DeleteCampaign name={campaign.name} onDelete={() => (deleteCampaign(campaign.id), router.push("/campaigns"))} />
      </main>
    </>
  );
}

function AddCreator({ campaignId }: { campaignId: string }) {
  const [error, setError] = useState("");
  function submit(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    const channel = String(form.get("channel") ?? "").trim();
    if (!name) return setError("크리에이터 이름을 입력해 주세요.");
    setError("");
    addEntry(campaignId, name, channel || "채널 미정");
  }
  return (
    <form action={submit} aria-label="크리에이터 추가" className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input name="name" aria-label="크리에이터 이름" placeholder="크리에이터 이름" className={`${ui.input} w-44`} />
        <input name="channel" aria-label="채널" placeholder="채널 (예: 인스타그램)" className={`${ui.input} w-48`} />
        <button type="submit" className={ui.primary}>
          추가
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-danger-700">
          {error}
        </p>
      )}
    </form>
  );
}

// Deleting can't be undone, so it asks once inline (same pattern as 드랍).
function DeleteCampaign({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line py-8 text-[14px]">
      {asking ? (
        <>
          <span className="text-ink-800">{name} 캠페인을 삭제할까요? 크리에이터 진행 기록과 제출 링크도 함께 지워집니다.</span>
          <button type="button" onClick={onDelete} className="min-h-10 bg-danger-700 px-4 font-semibold text-white hover:bg-[#8c2525]">
            삭제
          </button>
          <button type="button" onClick={() => setAsking(false)} className="min-h-10 border border-line px-4 font-semibold text-ink-800 hover:border-ink-600">
            취소
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="min-h-10 text-ink-600 underline underline-offset-4 hover:text-danger-700">
          캠페인 삭제
        </button>
      )}
    </div>
  );
}
