"use client";
import { STEPS, REPORT, doneList, entryStatus, type Campaign } from "@/lib/campaigns";
import { toggleStep, updateEntry } from "@/lib/store";
import { DeadlineLine, WaitingLine } from "./badges";
import { FollowUp } from "./FollowUp";

const th = "border-b border-line bg-[#f5f7fa] px-2 py-3 text-[13px] font-semibold leading-tight text-ink-800";
const td = "border-b border-line px-2 py-3 align-top";
// The name column stays put while the steps scroll sideways on narrow screens.
const sticky = "sticky left-0 z-10 bg-white";

// 팀장 피드백 11/7: 크리에이터마다 부킹 요청 → 업로드 한 프로세스를 끝날 때마다 체크. 리포트 작성은 업로드 뒤 마무리.
export function CreatorTable({ campaign, today }: { campaign: Campaign; today: string }) {
  const live = campaign.entries.filter((e) => !e.droppedAt);
  const dropped = campaign.entries.filter((e) => e.droppedAt);

  return (
    <>
      {live.length > 0 && <p className="mb-2 text-[13px] text-ink-600 md:hidden">표를 옆으로 밀면 단계별 체크칸이 나옵니다.</p>}
      {live.length === 0 ? (
        <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">아직 크리에이터가 없습니다. 위에서 이름과 채널을 넣어 추가하세요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-t-2 border-ink-900 text-[14px]">
            <thead>
              <tr>
                <th scope="col" className={`${th} sticky left-0 z-10 w-[170px] px-3 text-left`}>
                  크리에이터
                </th>
                <th scope="col" className={`${th} w-[190px] text-left`}>
                  지금 상태
                </th>
                {STEPS.map((s, i) => (
                  <th key={s.label} scope="col" className={`${th} w-[68px] text-center ${i === REPORT ? "border-l-2 border-l-line-strong" : ""}`}>
                    <span className="block text-[11px] font-medium tabular-nums text-ink-600">{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {live.map((e) => {
                const s = entryStatus(e, campaign, today);
                const done = doneList(e);
                const next = done.findIndex((d) => !d);
                return (
                  <tr key={e.id} className="group">
                    <th scope="row" className={`${td} ${sticky} px-3 text-left font-normal group-hover:bg-[#f5f7fa]`}>
                      <span className="block text-[16px] font-bold text-ink-900">{e.name}</span>
                      <span className="block text-[13px] text-ink-600">{e.channel}</span>
                    </th>
                    <td className={`${td} group-hover:bg-[#f5f7fa]`}>
                      <p className="text-[14px] font-bold text-ink-900">
                        {s.finished ? "완료" : `다음: ${s.step}`}
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {!s.finished && <WaitingLine on={s.waitingOn} days={s.waitingDays} />}
                        {s.deadline && <DeadlineLine deadline={s.deadline} />}
                        <div className="empty:hidden">
                          <FollowUp campaignId={campaign.id} entryId={e.id} name={e.name} waitingOn={s.waitingOn} days={s.waitingDays} remindedAt={e.remindedAt} />
                        </div>
                      </div>
                    </td>
                    {STEPS.map((step, i) => (
                      <td
                        key={step.label}
                        className={`${td} text-center ${i === next ? "bg-primary-100" : "group-hover:bg-[#f5f7fa]"} ${i === REPORT ? "border-l-2 border-l-line-strong" : ""}`}
                      >
                        <label className="flex min-h-11 cursor-pointer flex-col items-center justify-start gap-1">
                          <input
                            type="checkbox"
                            className="size-5 accent-primary-600"
                            checked={!!done[i]}
                            onChange={(ev) => toggleStep(campaign.id, e.id, i, ev.target.checked)}
                            aria-label={`${e.name} ${step.label}`}
                          />
                          <span className="text-[12px] tabular-nums text-ink-600">{done[i] ? done[i]!.slice(5).replace("-", "/") : ""}</span>
                        </label>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[13px] text-ink-600">
        체크하면 오늘 날짜가 기록됩니다. 파란 칸이 크리에이터마다 다음에 할 단계입니다.
      </p>

      {dropped.length > 0 && (
        <section aria-labelledby="dropped" className="mt-10">
          <h3 id="dropped" className="flex h-12 items-center gap-2 border-t-2 border-line-strong text-[16px] font-bold text-ink-600">
            드랍 <span className="tabular-nums">{dropped.length}</span>
          </h3>
          <ul>
            {dropped.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 text-[15px]">
                <span className="font-semibold text-ink-800">{e.name}</span>
                <span className="text-[13px] text-ink-600">
                  {e.channel} · {e.droppedAt!.slice(5).replace("-", "/")} 드랍
                </span>
                <button
                  type="button"
                  onClick={() => updateEntry(campaign.id, e.id, () => ({ droppedAt: null }))}
                  className="min-h-9 text-[13px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700"
                >
                  되돌리기
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
