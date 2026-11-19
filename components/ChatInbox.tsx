"use client";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";
import { onLive } from "@/lib/live";
import { ChatPanel, entryOfKey, useUnreadSummary } from "./ChatPanel";
import { Loading, pageWrap, ui } from "./PageBand";

/** title/sub: as this viewer sees it (staff: creator · campaign, creator: campaign, 팀원: the other person · role). */
type Thread = {
  entryId: string;
  kind: "creator" | "team";
  campaignId: string;
  title: string;
  sub: string;
  nick: string;
  joined: boolean;
  dropped: boolean;
  n: number;
  last: { text: string; at: string; mine: boolean } | null;
};

const when = (iso: string) => {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return day(d) === day(new Date())
    ? d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
};

/**
 * 대화 tab (기획자 11/19: 채팅 탭을 따로): every conversation this account may open, newest first, and the open one
 * beside it. Staff see one thread per creator row of the campaigns they may see, and under 팀원 a 1:1 thread with
 * each 담당자 they share a campaign with (developers: with everyone); a creator sees one per campaign.
 * The open thread is in the address (#entry id), so the header's 새 메시지 list and the back button land on it.
 */
export function ChatInbox() {
  const me = useMe();
  const creator = me?.role === "creator";
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [open, setOpen] = useState("");
  const [q, setQ] = useState("");
  const [onlyTalked, setOnlyTalked] = useState(true);
  // The tab picked while `at` was the open thread. Opening another thread shows the tab that thread is in.
  const [picked, setPicked] = useState<{ kind: Thread["kind"]; at: string }>({ kind: "creator", at: "" });
  const { unread } = useUnreadSummary();
  const counts = JSON.stringify(unread); // changes when a message arrives anywhere: reload the list then

  useEffect(() => {
    const read = () => setOpen(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/chat?list=1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { threads: Thread[] } | null) => live && d && setThreads(d.threads))
        .catch(() => {});
    load();
    const off = onLive((k) => entryOfKey(k) && load());
    const t = setInterval(() => !document.hidden && load(), 30_000);
    return () => {
      live = false;
      off();
      clearInterval(t);
    };
  }, [counts]);

  const pick = (id: string) => {
    window.history.pushState(null, "", `#${encodeURIComponent(id)}`);
    setOpen(id);
  };
  const back = () => {
    window.history.pushState(null, "", window.location.pathname);
    setOpen("");
  };

  if (!threads || !me) return <main className={`${pageWrap} py-10`}><Loading /></main>;

  const current = threads.find((t) => t.entryId === open);
  const tab = picked.at === open || !current ? picked.kind : current.kind;
  const inTab = creator ? threads : threads.filter((t) => t.kind === tab);
  const unreadOf = (k: Thread["kind"]) => threads.filter((t) => t.kind === k).reduce((n, t) => n + t.n, 0);
  const talked = inTab.filter((t) => t.last);
  const needle = q.trim();
  // Staff: conversations so far by default; searching or "전체" lists every thread, to start a new one.
  const shown = inTab.filter((t) => (creator || !onlyTalked || needle || t.entryId === open ? true : !!t.last)).filter((t) => !needle || t.title.includes(needle) || t.nick.includes(needle) || t.sub.includes(needle));

  return (
    <main className={`${pageWrap} py-8 md:py-10`}>
      <div className="grid border border-line md:h-[calc(100vh-260px)] md:min-h-[520px] md:grid-cols-[340px_1fr]">
        {/* list */}
        <section aria-label="대화 목록" className={`flex min-h-0 min-w-0 flex-col border-line md:border-r ${current ? "hidden md:flex" : "flex"}`}>
          {!creator && (
            <div role="group" aria-label="대화 종류" className="flex border-b border-line text-[14px] font-semibold">
              {(["creator", "team"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={tab === k} onClick={() => setPicked({ kind: k, at: open })} className="-mb-px min-h-11 flex-1 border-b-2 border-transparent text-ink-600 hover:text-ink-900 aria-pressed:border-ink-900 aria-pressed:text-ink-900">
                  {k === "creator" ? "크리에이터" : "팀원"}
                  {unreadOf(k) > 0 && <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-700 px-1.5 align-[1px] text-[11px] font-bold text-white tabular-nums">{unreadOf(k)}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="border-b border-line p-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={creator ? "캠페인 찾기…" : tab === "team" ? "이름 찾기…" : "크리에이터·캠페인 찾기…"} autoComplete="off" aria-label="대화 찾기" className={`${ui.input} h-11 w-full text-[15px]`} />
            {!creator && (
              <div role="group" aria-label="보기" className="mt-2 flex text-[13px] font-semibold">
                {([[true, `대화한 ${tab === "team" ? "팀원" : "사람"} ${talked.length}`], [false, `전체 ${inTab.length}`]] as const).map(([v, label]) => (
                  <button key={label} type="button" aria-pressed={onlyTalked === v} onClick={() => setOnlyTalked(v)} className="min-h-9 flex-1 border border-line text-ink-800 first:border-r-0 aria-pressed:bg-ink-900 aria-pressed:text-white">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {shown.map((t) => (
              <li key={t.entryId}>
                <button
                  type="button"
                  onClick={() => pick(t.entryId)}
                  aria-current={t.entryId === open ? "true" : undefined}
                  className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-[#f5f7fa] aria-[current=true]:bg-primary-100"
                >
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-900/[0.07] text-[15px] font-bold text-ink-800">
                    {t.title.trim().slice(0, 1) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-bold text-ink-900">
                        {t.title}
                        {t.nick && <span className="ml-1.5 text-[13px] font-semibold text-ink-600">{t.nick}</span>}
                        {t.dropped && <span className="ml-1 text-[12px] font-semibold text-ink-600">드랍</span>}
                      </span>
                      {t.last && <span className="shrink-0 text-[12px] text-ink-600 tabular-nums">{when(t.last.at)}</span>}
                    </span>
                    {t.sub && <span className="block truncate text-[12px] text-ink-600">{t.sub}</span>}
                    <span className={`mt-0.5 block truncate text-[14px] ${t.n ? "font-semibold text-ink-900" : "text-ink-600"}`}>
                      {t.last ? `${t.last.mine ? "나: " : ""}${t.last.text}` : t.joined || creator ? "아직 대화가 없습니다" : "아직 가입 전"}
                    </span>
                  </span>
                  {t.n > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger-700 px-1.5 text-[11px] font-bold text-white tabular-nums">{t.n}</span>}
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-4 py-10 text-center text-[14px] leading-relaxed text-ink-600">
                {needle
                  ? "찾는 대화가 없습니다."
                  : creator
                    ? "참여 중인 캠페인이 없습니다."
                    : tab === "team" && inTab.length === 0
                      ? "같은 캠페인을 맡은 담당자가 없습니다. 캠페인 담당자에 함께 들어가면 여기서 대화할 수 있습니다."
                      : `아직 대화가 없습니다. ‘전체’에서 ${tab === "team" ? "팀원" : "크리에이터"}을 골라 대화를 시작하세요.`}
              </li>
            )}
          </ul>
        </section>

        {/* open thread */}
        <section aria-label="대화" className={`min-h-0 min-w-0 flex-col ${current ? "flex" : "hidden md:flex"}`}>
          {current ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button type="button" onClick={back} className="min-h-9 text-[14px] font-semibold text-ink-800 hover:text-primary-600 md:hidden">
                  ‹ 목록
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold text-ink-900">
                    {current.kind === "team" ? current.title : creator ? `${current.title} 담당자` : current.title}
                    {current.nick && <span className="ml-1.5 text-[14px] font-semibold text-ink-600">{current.nick}</span>}
                  </p>
                  {current.kind === "team" && <p className="truncate text-[13px] text-ink-600">{current.sub}</p>}
                  {!creator && current.kind === "creator" && (
                    <a href={`/campaigns/${current.campaignId}`} className="block truncate text-[13px] text-ink-600 underline-offset-4 hover:text-primary-600 hover:underline">
                      {current.sub} 진행 현황 보기
                    </a>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <ChatPanel key={current.entryId} entryId={current.entryId} side={creator ? "creator" : "staff"} title="" fill />
              </div>
            </>
          ) : (
            <p className="m-auto px-6 py-16 text-center text-[15px] text-ink-600">왼쪽에서 대화를 고르세요.</p>
          )}
        </section>
      </div>
    </main>
  );
}
