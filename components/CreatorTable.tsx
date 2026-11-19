"use client";
import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
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
import { MailForm } from "./MailForm";

const th = "border-b border-line bg-[#f5f7fa] px-2 py-3 text-[13px] font-semibold leading-tight text-ink-800";
const td = "border-b border-line px-2 py-3 align-top";
// The name column stays put while the steps scroll sideways on narrow screens.
const sticky = "sticky left-0 z-10 bg-white";

/** Phone or desktop: the table needs room for 11 step columns; below 768px each creator is a card instead. */
const WIDE = "(min-width: 768px)";
const subscribeWide = (l: () => void) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", l);
  return () => m.removeEventListener("change", l);
};
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);

type Panel = "edit" | "chat" | "mail";
// Small square buttons for a row's actions: big enough to tap, in the site's line-ruled style.
const act = "inline-flex min-h-9 items-center gap-1.5 border border-line bg-white px-2.5 text-[13px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-700 aria-expanded:border-ink-900 aria-expanded:bg-ink-900 aria-expanded:text-white";

/** 계약서 작성 · 마감·단가·초대 · 대화 · 알림 메일, as one row of buttons (table and card alike). */
function RowActions({ campaign, e, panel, toggle, unread, late }: { campaign: Campaign; e: Entry; panel: Panel | null; toggle: (p: Panel) => void; unread: number; late: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <a href={contractLink(campaign, e)} target="_blank" rel="noopener noreferrer" className={act}>
        계약서<span aria-hidden>↗</span>
        <span className="sr-only"> 작성 (계약서 앱, 새 탭)</span>
      </a>
      <button type="button" aria-expanded={panel === "edit"} onClick={() => toggle("edit")} className={act}>
        마감·단가·초대
      </button>
      <button type="button" aria-expanded={panel === "chat"} onClick={() => toggle("chat")} className={act}>
        대화
        {unread > 0 && panel !== "chat" && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-700 px-1.5 text-[11px] font-bold text-white tabular-nums">
            {unread}
            <span className="sr-only">개 안 읽음</span>
          </span>
        )}
      </button>
      {late && (
        <button type="button" aria-expanded={panel === "mail"} onClick={() => toggle("mail")} className={`${act} border-danger-700 text-danger-700 hover:border-danger-700 hover:text-danger-700`}>
          알림 메일
        </button>
      )}
    </div>
  );
}

/** 다음 단계 · 누구 차례 · 가장 가까운 마감 (red once passed) · 드랍. */
function StatusLines({ campaign, e, today }: { campaign: Campaign; e: Entry; today: string }) {
  const s = entryStatus(e, campaign, today);
  return (
    <>
      <p className="text-[14px] font-bold text-ink-900">{s.finished ? "완료" : `다음: ${s.step}`}</p>
      <div className="mt-1 flex flex-col gap-1">
        {!s.finished && <WaitingLine on={s.waitingOn} days={s.waitingDays} />}
        {s.deadline && <DeadlineLine deadline={s.deadline} />}
        <div className="empty:hidden">
          <LateDrop campaignId={campaign.id} entryId={e.id} name={e.name} waitingOn={s.waitingOn} />
        </div>
      </div>
    </>
  );
}

/** What opens under a row: 마감·단가·초대, the conversation, or the reminder mail. */
function RowPanel({ campaign, e, panel, close }: { campaign: Campaign; e: Entry; panel: Panel; close: () => void }) {
  if (panel === "chat")
    return (
      <div id={`chat-${e.id}`} className="max-w-2xl scroll-mt-24">
        <ChatPanel entryId={e.id} side="staff" title={`${e.name} 님과 대화`} />
      </div>
    );
  if (panel === "mail") return <MailForm campaign={campaign} entry={e} onClose={close} />;
  return (
    <>
      <DueEditor campaign={campaign} entry={e} />
      <DealEditor campaign={campaign} entry={e} />
      <CreatorAccess campaign={campaign} entry={e} />
    </>
  );
}

// 기획자 피드백 11/7: 크리에이터마다 부킹 요청 → 업로드 한 프로세스를 끝날 때마다 체크. 리포트 작성은 업로드 뒤 마무리.
export function CreatorTable({ campaign, today }: { campaign: Campaign; today: string }) {
  const active = campaign.entries.filter((e) => !e.droppedAt);
  const dropped = campaign.entries.filter((e) => e.droppedAt);
  // 기획자 11/17: a passed deadline stays in 진행 중 with a red warning; a creator moves to 완료 once their upload is checked.
  const [view, setView] = useState<"live" | "done">("live");
  const doneIds = new Set(active.filter((e) => e.done[UPLOAD]).map((e) => e.id));
  const live = active.filter((e) => (view === "done") === doneIds.has(e.id));
  // One panel open per row at most: 마감·단가·초대, 대화 (기획자 11/19) or 알림 메일.
  const [panels, setPanels] = useState<Record<string, Panel | undefined>>({});
  const toggle = (id: string, p: Panel) => setPanels((x) => ({ ...x, [id]: x[id] === p ? undefined : p }));
  const close = (id: string) => setPanels((x) => ({ ...x, [id]: undefined }));
  const unread = useUnread();
  const wide = useWide();
  // The header's 새 메시지 list links to …#chat-<entry id>: open that conversation and bring it into view.
  useEffect(() => {
    const go = () => {
      const m = window.location.hash.match(/^#chat-(.+)$/);
      if (!m) return;
      const id = decodeURIComponent(m[1]);
      if (!campaign.entries.some((e) => e.id === id)) return;
      setPanels((x) => ({ ...x, [id]: "chat" }));
      requestAnimationFrame(() => document.getElementById(`chat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [campaign.entries]);
  const submissions = useSubmissions();
  const late = (e: Entry) => entryStatus(e, campaign, today).overdue;

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
      {live.length === 0 ? (
        <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">
          {active.length === 0 ? "아직 크리에이터가 없습니다. 위에서 이름과 채널을 넣어 추가하세요." : view === "done" ? "아직 업로드를 마친 크리에이터가 없습니다." : "모든 크리에이터가 업로드를 마쳤습니다. 완료에서 확인하세요."}
        </p>
      ) : !wide ? (
        <ul className="border-t-2 border-ink-900">
          {live.map((e) => (
            <CreatorCard key={e.id} campaign={campaign} e={e} today={today} panel={panels[e.id] ?? null} toggle={(p) => toggle(e.id, p)} close={() => close(e.id)} unread={unread[e.id] ?? 0} late={late(e)} handedIn={(i) => submissions.filter((x) => x.entryId === e.id && x.step === i)} />
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-t-2 border-ink-900 text-[14px]">
            <thead>
              <tr>
                <th scope="col" className={`${th} sticky left-0 z-10 w-[190px] px-3 text-left`}>
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
                const done = doneList(e);
                const next = done.findIndex((d) => !d);
                const dues = dueList(e, campaign);
                const panel = panels[e.id] ?? null;
                return (
                  <Fragment key={e.id}>
                    <tr className="group">
                      <th scope="row" className={`${td} ${sticky} px-3 text-left font-normal group-hover:bg-[#f5f7fa]`}>
                        <span className="block max-w-[220px] text-[16px] font-bold text-ink-900 wrap-anywhere">{e.name}</span>
                        <span className="block max-w-[220px] text-[13px] text-ink-600 wrap-anywhere">{e.channel}</span>
                        {(e.creatorId || e.invite) && <span className="block text-[12px] text-ink-600">{e.creatorId ? "계정 연결됨" : "초대 링크 만듦"}</span>}
                        <RowActions campaign={campaign} e={e} panel={panel} toggle={(p) => toggle(e.id, p)} unread={unread[e.id] ?? 0} late={late(e)} />
                      </th>
                      <td className={`${td} group-hover:bg-[#f5f7fa]`}>
                        <StatusLines campaign={campaign} e={e} today={today} />
                      </td>
                      {STEPS.map((step, i) => {
                        // 기획자 11/11: 크리에이터가 낸 기획안·가편안·수정본 링크. The newest one opens; the count shows resubmits.
                        const handed = submissions.filter((x) => x.entryId === e.id && x.step === i);
                        return (
                          <td key={step.label} className={`${td} text-center ${i === next ? "bg-primary-100" : "group-hover:bg-[#f5f7fa]"} ${i === REPORT ? "border-l-2 border-l-line-strong" : ""}`}>
                            <label className="flex min-h-11 cursor-pointer flex-col items-center justify-start gap-1">
                              <input type="checkbox" className="size-5 accent-primary-600" checked={!!done[i]} onChange={(ev) => toggleStep(campaign.id, e.id, i, ev.target.checked)} aria-label={`${e.name} ${step.label}`} />
                              <span className="text-[12px] tabular-nums text-ink-600">{done[i] ? short(done[i]!) : ""}</span>
                              {!done[i] && dues[i] && <DueMark date={dues[i]!} today={today} own={i !== UPLOAD || !!e.due?.[UPLOAD]} />}
                            </label>
                            {handed.length > 0 && <Handed e={e} label={step.label} handed={handed} />}
                          </td>
                        );
                      })}
                    </tr>
                    {panel && (
                      <tr>
                        <td colSpan={STEPS.length + 2} className="border-b border-line bg-[#f5f7fa] px-3 py-5">
                          <RowPanel campaign={campaign} e={e} panel={panel} close={() => close(e.id)} />
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
        {wide
          ? "체크하면 오늘 날짜가 기록됩니다. 파란 칸이 크리에이터마다 다음에 할 단계입니다. 체크칸 아래 ‘~날짜’는 그 단계의 마감이고, 지나면 빨간색입니다. 크리에이터가 링크를 제출하면 그 단계가 체크되고 ‘제출본’이 붙습니다."
          : "파란 버튼을 누르면 다음 단계가 오늘 날짜로 체크됩니다. 다른 단계는 ‘단계 전체 보기’에서 체크합니다."}
      </p>

      {dropped.length > 0 && (
        <section aria-labelledby="dropped" className="mt-10">
          <h3 id="dropped" className="flex h-12 items-center gap-2 border-t-2 border-line-strong text-[16px] font-bold text-ink-600">
            드랍 <span className="tabular-nums">{dropped.length}</span>
          </h3>
          <ul>
            {dropped.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 text-[15px]">
                <span className="font-semibold text-ink-800 wrap-anywhere">{e.name}</span>
                <span className="text-[13px] text-ink-600">
                  {e.channel} · {short(e.droppedAt!)} 드랍
                </span>
                <button type="button" onClick={() => dropEntry(campaign.id, e.id, false)} className="min-h-9 text-[13px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700">
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

/** 제출본 link under a step: the newest one opens, the count shows resubmits. */
function Handed({ e, label, handed }: { e: Entry; label: string; handed: { url: string; note: string }[] }) {
  return (
    <a href={handed.at(-1)!.url} target="_blank" rel="noopener noreferrer" title={handed.at(-1)!.note || undefined} className="mt-1 inline-flex min-h-8 items-center text-[12px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700">
      제출본{handed.length > 1 ? ` ${handed.length}` : ""}
      <span aria-hidden>↗</span>
      <span className="sr-only">
        {" "}
        ({e.name} {label}, 새 탭)
      </span>
    </a>
  );
}

/**
 * Phone: one card per creator (11/19 휴대폰 보기). The next step is one big button; every step, with its date,
 * deadline and 제출본, folds open under it. Same data and actions as the table row.
 */
function CreatorCard({ campaign, e, today, panel, toggle, close, unread, late, handedIn }: {
  campaign: Campaign;
  e: Entry;
  today: string;
  panel: Panel | null;
  toggle: (p: Panel) => void;
  close: () => void;
  unread: number;
  late: boolean;
  handedIn: (step: number) => { url: string; note: string }[];
}) {
  const [all, setAll] = useState(false);
  const done = doneList(e);
  const next = done.findIndex((d) => !d);
  const dues = dueList(e, campaign);
  const count = done.filter(Boolean).length;
  return (
    <li className="border-b border-line py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-ink-900 wrap-anywhere">{e.name}</p>
          <p className="text-[13px] text-ink-600 wrap-anywhere">
            {e.channel}
            {(e.creatorId || e.invite) && ` · ${e.creatorId ? "계정 연결됨" : "초대 링크 만듦"}`}
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-600">
          {count}/{STEPS.length}
        </span>
      </div>
      <div className="mt-3">
        <StatusLines campaign={campaign} e={e} today={today} />
      </div>
      {next !== -1 && (
        <button type="button" onClick={() => toggleStep(campaign.id, e.id, next, true)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 bg-primary-600 px-4 text-[15px] font-bold text-white hover:bg-primary-700">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          {STEPS[next].label} 체크
        </button>
      )}
      <RowActions campaign={campaign} e={e} panel={panel} toggle={toggle} unread={unread} late={late} />
      <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="mt-3 flex min-h-10 w-full items-center justify-between border-t border-line pt-1 text-[14px] font-semibold text-ink-800 hover:text-primary-700">
        단계 전체 보기
        <span aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${all ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {all && (
        <ol className="border-t border-line">
          {STEPS.map((step, i) => {
            const handed = handedIn(i);
            return (
              <li key={step.label} className={`flex items-center gap-3 border-b border-line px-1 py-1 last:border-b-0 ${i === next ? "bg-primary-100" : ""}`}>
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" className="size-5 shrink-0 accent-primary-600" checked={!!done[i]} onChange={(ev) => toggleStep(campaign.id, e.id, i, ev.target.checked)} />
                  <span className="w-6 shrink-0 text-[12px] tabular-nums text-ink-600">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 text-[15px] text-ink-900">{step.label}</span>
                </label>
                <span className="shrink-0 text-right">
                  {done[i] ? <span className="text-[12px] tabular-nums text-ink-600">{short(done[i]!)}</span> : dues[i] && <DueMark date={dues[i]!} today={today} own={i !== UPLOAD || !!e.due?.[UPLOAD]} />}
                  {handed.length > 0 && (
                    <span className="block">
                      <Handed e={e} label={step.label} handed={handed} />
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {panel && (
        <div className="mt-3 border-t border-line bg-[#f5f7fa] px-3 py-4">
          <RowPanel campaign={campaign} e={e} panel={panel} close={close} />
        </div>
      )}
    </li>
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
