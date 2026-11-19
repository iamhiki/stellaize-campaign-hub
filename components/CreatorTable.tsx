"use client";
import { Fragment, useState } from "react";
import { STEPS, REPORT, UPLOAD, doneList, dueList, entryStatus, type Campaign, type Entry } from "@/lib/campaigns";
import { CreatorAccess } from "./CreatorAccess";
import { ChatPanel, useUnread } from "./ChatPanel";
import { DateInput } from "./DateInput";
import { DealEditor } from "./DealEditor";
import { daysBetween } from "@/lib/date";
import { dropEntry, setDue, setDueForAll, toggleStep, useSubmissions } from "@/lib/store";
import { contractLink } from "@/lib/contract";
import { DeadlineLine, WaitingLine } from "./badges";
import { LateDrop } from "./FollowUp";

const th = "border-b border-line bg-[#f5f7fa] px-2 py-3 text-[13px] font-semibold leading-tight text-ink-800";
const td = "border-b border-line px-2 py-3 align-top";
// The name column stays put while the steps scroll sideways on narrow screens.
const sticky = "sticky left-0 z-10 bg-white";

// 기획자 피드백 11/7: 크리에이터마다 부킹 요청 → 업로드 한 프로세스를 끝날 때마다 체크. 리포트 작성은 업로드 뒤 마무리.
export function CreatorTable({ campaign, today }: { campaign: Campaign; today: string }) {
  const active = campaign.entries.filter((e) => !e.droppedAt);
  const dropped = campaign.entries.filter((e) => e.droppedAt);
  // 기획자 11/17: a passed deadline stays in 진행 중 with a red warning; a creator moves to 완료 once their upload is checked.
  const [view, setView] = useState<"live" | "done">("live");
  const doneIds = new Set(active.filter((e) => e.done[UPLOAD]).map((e) => e.id));
  const live = active.filter((e) => (view === "done") === doneIds.has(e.id));
  const [editing, setEditing] = useState<string | null>(null);
  const [chatting, setChatting] = useState<string | null>(null); // the row whose 대화 is open (기획자 11/19)
  const unread = useUnread();
  const submissions = useSubmissions();

  return (
    <>
      {(doneIds.size > 0 || view === "done") && (
        <div role="group" aria-label="보기" className="mb-4 flex w-fit border border-line">
          {([["live", `진행 중 ${active.length - doneIds.size}`], ["done", `완료 ${doneIds.size}`]] as const).map(([v, text]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="min-h-10 px-4 text-[14px] font-semibold tabular-nums text-ink-800 hover:text-primary-600 aria-pressed:bg-ink-900 aria-pressed:text-white">
              {text}
            </button>
          ))}
        </div>
      )}
      {live.length > 0 && <p className="mb-2 text-[13px] text-ink-600 md:hidden">표를 옆으로 밀면 단계별 체크칸이 나옵니다.</p>}
      {live.length === 0 ? (
        <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">
          {active.length === 0 ? "아직 크리에이터가 없습니다. 위에서 이름과 채널을 넣어 추가하세요." : view === "done" ? "아직 업로드를 마친 크리에이터가 없습니다." : "모든 크리에이터가 업로드를 마쳤습니다. 완료에서 확인하세요."}
        </p>
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
                const dues = dueList(e, campaign);
                const open = editing === e.id;
                return (
                  <Fragment key={e.id}>
                  <tr className="group">
                    <th scope="row" className={`${td} ${sticky} px-3 text-left font-normal group-hover:bg-[#f5f7fa]`}>
                      <span className="block text-[16px] font-bold text-ink-900">{e.name}</span>
                      <span className="block text-[13px] text-ink-600">{e.channel}</span>
                      {(e.creatorId || e.invite) && <span className="block text-[12px] text-ink-600">{e.creatorId ? "계정 연결됨" : "초대 링크 만듦"}</span>}
                      <a
                        href={contractLink(campaign, e)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-8 items-center text-[13px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700"
                      >
                        계약서 작성<span aria-hidden>↗</span>
                        <span className="sr-only"> (계약서 앱, 새 탭)</span>
                      </a>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setEditing(open ? null : e.id)}
                        className="block min-h-8 text-[13px] text-ink-600 underline underline-offset-4 hover:text-primary-600"
                      >
                        {open ? "닫기" : "마감 · 단가 · 초대"}
                      </button>
                      <button
                        type="button"
                        aria-expanded={chatting === e.id}
                        onClick={() => setChatting(chatting === e.id ? null : e.id)}
                        className="mt-1 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700"
                      >
                        {chatting === e.id ? "대화 닫기" : "대화"}
                        {!!unread[e.id] && chatting !== e.id && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center bg-danger-700 px-1.5 text-[11px] font-bold text-white no-underline tabular-nums">
                            {unread[e.id]}
                            <span className="sr-only">개 안 읽음</span>
                          </span>
                        )}
                      </button>
                    </th>
                    <td className={`${td} group-hover:bg-[#f5f7fa]`}>
                      <p className="text-[14px] font-bold text-ink-900">
                        {s.finished ? "완료" : `다음: ${s.step}`}
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {!s.finished && <WaitingLine on={s.waitingOn} days={s.waitingDays} />}
                        {s.deadline && <DeadlineLine deadline={s.deadline} />}
                        {s.overdue && (
                          <p role="note" className="border-l-2 border-danger-700 pl-2 text-[13px] font-semibold leading-snug text-danger-700">
                            {s.deadline!.label} 마감이 지났습니다. 크리에이터에게 다시 알려 주세요.
                          </p>
                        )}
                        <div className="empty:hidden">
                          <LateDrop campaignId={campaign.id} entryId={e.id} name={e.name} waitingOn={s.waitingOn} />
                        </div>
                      </div>
                    </td>
                    {STEPS.map((step, i) => {
                      // 기획자 11/11: 크리에이터가 낸 기획안·가편안·수정본 링크. The newest one opens; the count shows resubmits.
                      const handed = submissions.filter((x) => x.entryId === e.id && x.step === i);
                      return (
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
                          {!done[i] && dues[i] && <DueMark date={dues[i]!} today={today} own={i !== UPLOAD || !!e.due?.[UPLOAD]} />}
                        </label>
                        {handed.length > 0 && (
                          <a
                            href={handed.at(-1)!.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={handed.at(-1)!.note || undefined}
                            className="mt-1 inline-flex min-h-8 items-center text-[12px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700"
                          >
                            제출본{handed.length > 1 ? ` ${handed.length}` : ""}
                            <span aria-hidden>↗</span>
                            <span className="sr-only"> ({e.name} {step.label}, 새 탭)</span>
                          </a>
                        )}
                      </td>
                      );
                    })}
                  </tr>
                  {chatting === e.id && (
                    <tr>
                      <td colSpan={STEPS.length + 2} className="border-b border-line bg-[#f5f7fa] px-3 py-5">
                        <div className="max-w-2xl">
                          <ChatPanel entryId={e.id} side="staff" title={`${e.name} 님과 대화`} />
                        </div>
                      </td>
                    </tr>
                  )}
                  {open && (
                    <tr>
                      <td colSpan={STEPS.length + 2} className="border-b border-line bg-[#f5f7fa] px-3 py-5">
                        <DueEditor campaign={campaign} entry={e} />
                        <DealEditor campaign={campaign} entry={e} />
                        <CreatorAccess campaign={campaign} entry={e} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[13px] text-ink-600">
        체크하면 오늘 날짜가 기록됩니다. 파란 칸이 크리에이터마다 다음에 할 단계입니다. 체크칸 아래 &lsquo;~날짜&rsquo;는 그 단계의 마감이고, 지나면 빨간색입니다. 크리에이터가 링크를 제출하면 그 단계가 체크되고 &lsquo;제출본&rsquo;이 붙습니다.
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
                  onClick={() => dropEntry(campaign.id, e.id, false)}
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

const short = (d: string) => d.slice(5).replace("-", "/");

// A step's deadline under its checkbox. Red only once it has passed. The campaign's upload date is shown lighter.
function DueMark({ date, today, own }: { date: string; today: string; own: boolean }) {
  const late = !!today && daysBetween(today, date) < 0;
  const tone = late ? "font-semibold text-danger-700" : own ? "text-ink-800" : "text-ink-600";
  return (
    <span className={`text-[12px] tabular-nums ${tone}`} title={late ? "마감 지남" : "마감"}>
      ~{short(date)}
    </span>
  );
}

// 기획자 답변 11/10: 단계별 마감 필요, 업로드 날짜는 크리에이터마다 지정. Dates save as soon as they change.
function DueEditor({ campaign, entry }: { campaign: Campaign; entry: Entry }) {
  const others = campaign.entries.filter((x) => !x.droppedAt && x.id !== entry.id).length;
  return (
    <div>
      <p className="mb-4 text-[14px] text-ink-800">
        <b className="font-bold text-ink-900">{entry.name}</b> 단계별 마감. 바꾸면 바로 저장됩니다. 비워 두면 마감 없음입니다.
      </p>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => {
          const value = entry.due?.[i] ?? "";
          const hint =
            i === UPLOAD ? (value ? "이 크리에이터만" : `캠페인 날짜 ${campaign.uploadDate}`) : i === REPORT && !value ? "비우면 업로드 후 14일" : "";
          return (
            <li key={s.label} className="flex flex-col gap-1">
              <label htmlFor={`due-${entry.id}-${i}`} className="text-[13px] font-semibold text-ink-800">
                {s.label}
                {i === UPLOAD && " 날짜"}
              </label>
              <DateInput id={`due-${entry.id}-${i}`} size="sm" value={value || null} placeholder="마감 없음" onChange={(v) => setDue(campaign.id, entry.id, i, v)} />
              <span className="flex flex-wrap gap-x-3 text-[12px] text-ink-600">
                {hint && <span>{hint}</span>}
                {value && others > 0 && (
                  <button type="button" onClick={() => setDueForAll(campaign.id, i, value)} className="underline underline-offset-4 hover:text-primary-600">
                    모두에게 적용
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
