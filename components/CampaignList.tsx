"use client";
import { useState } from "react";
import Link from "next/link";
import { entryStatus } from "@/lib/campaigns";
import { daysBetween } from "@/lib/date";
import { useCampaigns, useToday } from "@/lib/store";
import { DdayText } from "./badges";
import { CampaignForm } from "./CampaignForm";
import { Loading, table, ui } from "./PageBand";
import { ProgressBar } from "./ProgressBar";

// 기획자 피드백 11/7: 목록에는 캠페인 이름, 광고주, 채널, 업로드 날짜, 담당자. 진행률은 한눈에 보려고 남겼다.
export function CampaignList() {
  const campaigns = useCampaigns();
  const [adding, setAdding] = useState(false);
  const today = useToday();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <p className="text-[16px] text-ink-800">
          {campaigns ? (
            <>
              캠페인 <b className="tabular-nums text-ink-900">{campaigns.length}</b>개
            </>
          ) : (
            " "
          )}
        </p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={ui.primary}>
            + 캠페인 등록
          </button>
        )}
      </div>
      {adding && (
        <div className="mb-10">
          <CampaignForm onClose={() => setAdding(false)} />
        </div>
      )}

      {!campaigns ? (
        <Loading />
      ) : campaigns.length === 0 ? (
        <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">등록한 캠페인이 없습니다. 오른쪽 위 캠페인 등록으로 시작하세요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={table.wrap}>
            <thead>
              <tr>
                {["캠페인 이름", "광고주", "채널", "업로드 날짜", "담당자", "진행률"].map((h) => (
                  <th key={h} className={table.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const live = c.entries.filter((e) => !e.droppedAt);
                const late = live.filter((e) => entryStatus(e, c, today).overdue).length;
                return (
                  <tr key={c.id} className="hover:bg-[#f5f7fa]">
                    <td className={table.td}>
                      <Link href={`/campaigns/${c.id}`} className="text-[16px] font-bold text-ink-900 underline-offset-4 hover:text-primary-600 hover:underline">
                        {c.name}
                      </Link>
                      {c.confidential && <span className="ml-2 text-[13px] font-bold text-danger-700">대외비</span>}
                      <span className="mt-1 block text-[13px] font-semibold text-ink-600">
                        크리에이터 <span className="tabular-nums">{live.length}</span>명
                        {late > 0 && <span className="text-danger-700"> · 마감 지남 {late}건</span>}
                      </span>
                    </td>
                    <td className={table.td}>{c.advertiser}</td>
                    <td className={table.td}>{c.channel}</td>
                    <td className={`${table.td} whitespace-nowrap tabular-nums`}>
                      {c.uploadDate}
                      <DdayText days={daysBetween(today, c.uploadDate)} />
                    </td>
                    <td className={table.td}>{c.owners.join(", ")}</td>
                    <td className={`${table.td} w-[180px]`}>
                      <ProgressBar label={c.name} entries={c.entries} delay={200 + i * 120} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
