"use client";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";
import { onLive } from "@/lib/live";
import { ChatPanel, entryOfKey, useUnreadSummary } from "./ChatPanel";
import { Loading, pageWrap, ui } from "./PageBand";

type Thread = {
  entryId: string;
  campaignId: string;
  campaign: string;
  creator: string;
  joined: boolean;
  dropped: boolean;
  n: number;
  last: { text: string; at: string; from: "staff" | "creator" } | null;
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
 * beside it. Staff see one thread per creator row of the campaigns they may see; a creator sees one per campaign.
 * The open thread is in the address (#entry id), so the header's 새 메시지 list and the back button land on it.
 */
export function ChatInbox() {
  const me = useMe();
  const creator = me?.role === "creator";
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [open, setOpen] = useState("");
  const [q, setQ] = useState("");
  const [onlyTalked, setOnlyTalked] = useState(true);
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

  const talked = threads.filter((t) => t.last);
  const needle = q.trim();
  // Staff: conversations so far by default; searching or "전체" lists every creator row, to start a new one.
  const shown = threads.filter((t) => (creator || !onlyTalked || needle || t.entryId === open ? true : !!t.last)).filter((t) => !needle || t.creator.includes(needle) || t.campaign.includes(needle));
  const current = threads.find((t) => t.entryId === open);

  return (
    <main className={`${pageWrap} py-8 md:py-10`}>
      <div className="grid border border-line md:h-[calc(100vh-260px)] md:min-h-[520px] md:grid-cols-[340px_1fr]">
        {/* list */}
        <section aria-label="대화 목록" className={`flex min-h-0 flex-col border-line md:border-r ${current ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-line p-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={creator ? "캠페인 찾기" : "크리에이터·캠페인 찾기"} aria-label="대화 찾기" className={`${ui.input} h-11 w-full text-[15px]`} />
            {!creator && (
              <div role="group" aria-label="보기" className="mt-2 flex text-[13px] font-semibold">
                {([[true, `대화한 사람 ${talked.length}`], [false, `전체 ${threads.length}`]] as const).map(([v, label]) => (
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
                  className="flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left hover:bg-[#f5f7fa] aria-[current=true]:bg-primary-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-bold text-ink-900">
                        {creator ? t.campaign : t.creator}
                        {t.dropped && <span className="ml-1 text-[12px] font-semibold text-ink-600">드랍</span>}
                      </span>
                      {t.last && <span className="shrink-0 text-[12px] text-ink-600 tabular-nums">{when(t.last.at)}</span>}
                    </span>
                    {!creator && <span className="block truncate text-[12px] text-ink-600">{t.campaign}</span>}
                    <span className={`mt-0.5 block truncate text-[14px] ${t.n ? "font-semibold text-ink-900" : "text-ink-600"}`}>
                      {t.last ? `${t.last.from === (creator ? "creator" : "staff") ? "나: " : ""}${t.last.text}` : t.joined || creator ? "아직 대화가 없습니다" : "아직 가입 전"}
                    </span>
                  </span>
                  {t.n > 0 && <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center bg-danger-700 px-1.5 text-[11px] font-bold text-white tabular-nums">{t.n}</span>}
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-4 py-10 text-center text-[14px] leading-relaxed text-ink-600">
                {needle ? "찾는 대화가 없습니다." : creator ? "참여 중인 캠페인이 없습니다." : "아직 대화가 없습니다. ‘전체’에서 크리에이터를 골라 대화를 시작하세요."}
              </li>
            )}
          </ul>
        </section>

        {/* open thread */}
        <section aria-label="대화" className={`min-h-0 flex-col ${current ? "flex" : "hidden md:flex"}`}>
          {current ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button type="button" onClick={back} className="min-h-9 text-[14px] font-semibold text-ink-800 hover:text-primary-600 md:hidden">
                  ‹ 목록
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold text-ink-900">{creator ? `${current.campaign} 담당자` : current.creator}</p>
                  {!creator && (
                    <a href={`/campaigns/${current.campaignId}`} className="block truncate text-[13px] text-ink-600 underline-offset-4 hover:text-primary-600 hover:underline">
                      {current.campaign} 진행 현황 보기
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
