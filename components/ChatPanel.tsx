"use client";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { liveOn, onLive, startLive } from "@/lib/live";
import { useUnsaved } from "@/lib/unsaved";

type Msg = { id: string; from: "staff" | "creator"; name: string; text: string; at: string; mine: boolean; pending?: boolean };
/** readAts: how far each person whose reading counts got (null = not yet). */
type Thread = { messages: Msg[]; readAts: (string | null)[]; joined: boolean };


// Without the live signal a thread asks every 5 seconds and the counts every 20; with it, only as a safety net.
const POLL = 5_000;
const POLL_LIVE = 30_000;
const UNREAD_POLL = 20_000;
const UNREAD_POLL_LIVE = 60_000;

// ---- unread counts, shared by the header bell and every row badge on a page ----
/** title/sub: as this viewer sees the thread (staff: creator · campaign, creator: campaign, 1:1: the other person · role). */
export type UnreadThread = { entryId: string; campaignId: string; title: string; sub: string; n: number };
type Summary = { unread: Record<string, number>; threads: UnreadThread[]; keys: Record<string, string> };
let summary: Summary = { unread: {}, threads: [], keys: {} };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let stopLive: (() => void) | undefined;
/** Thread key → entry id, so a live signal can be matched to an open thread. */
export const entryOfKey = (k: string) => summary.keys[k];

function loadUnread() {
  if (typeof document !== "undefined" && document.hidden) return;
  fetch("/api/chat", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: (Summary & { live: { url: string; key: string; topic: string } | null }) | null) => {
      if (!d) return;
      startLive(d.live);
      // Only a real change re-renders: screens that reload on a change (the 대화 tab) would otherwise loop.
      const next = { unread: d.unread, threads: d.threads, keys: d.keys };
      if (JSON.stringify(next) === JSON.stringify(summary)) return;
      summary = next;
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    loadUnread();
    schedule();
  }, liveOn() ? UNREAD_POLL_LIVE : UNREAD_POLL);
}
function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    loadUnread();
    schedule();
    // A message somewhere this person may read: refresh the counts. Unknown keys are other people's threads.
    stopLive = onLive((k) => summary.keys[k] && loadUnread());
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) {
      clearTimeout(timer);
      stopLive?.();
    }
  };
}
const EMPTY: Summary = { unread: {}, threads: [], keys: {} };
/** Unread messages per creator row, and the threads they are in. */
export const useUnreadSummary = () => useSyncExternalStore(subscribe, () => summary, () => EMPTY);
export const useUnread = () => useUnreadSummary().unread;
/** Ask for the counts again now (after reading a thread). */
export const refreshUnread = () => loadUnread();

// ---- how a thread looks (11/19 대화창 다듬기: 카카오톡·iMessage·Slack 참고) ----
const TZ = "Asia/Seoul";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const dayLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, year: "numeric", month: "long", day: "numeric", weekday: "long" });
const clock = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
/** Messages from one person within this many minutes read as one group: name once, time once. */
const GROUP_MS = 5 * 60_000;
/** How close to the bottom counts as "reading the newest", so a new message scrolls into view. */
const NEAR_BOTTOM = 120;

/** Links in a message (드라이브, 유튜브 등) open in a new tab. Only http(s). */
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,!?)\]])/g;
function Linked({ text, mine }: { text: string; mine: boolean }) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`break-all underline underline-offset-2 ${mine ? "text-white" : "text-primary-700"}`}>
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Round initial for the other side's group. */
const Initial = ({ name }: { name: string }) => (
  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-900/[0.07] text-[13px] font-bold text-ink-800">
    {name.trim().slice(0, 1) || "?"}
  </span>
);

/**
 * One thread: 크리에이터 ↔ 담당자 (기획자 11/19) or 1:1 팀원 대화. `side` is who is looking; the server marks which
 * messages are theirs (right side) and how far each reader got (readAts). Next to a message of mine, the number of
 * people who haven't read it yet, as in 카카오톡 (1:1 and creator rooms: 1; 팀방: one per teammate). Staff see who on the team wrote each message; the creator sees it as from 스텔라이즈.
 * `fill`: take the height of the box it is in (the 대화 tab) instead of a fixed-height card.
 */
export function ChatPanel({ entryId, side, title, fill }: { entryId: string; side: "staff" | "creator"; title: string; fill?: boolean }) {
  const [data, setData] = useState<Thread | null>(null);
  const [pending, setPending] = useState<Msg[]>([]);
  const [error, setError] = useState("");
  const [below, setBelow] = useState(false); // a message arrived while scrolled up
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const count = useRef(0);
  const near = useRef(true);
  const unsaved = useUnsaved();

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/chat?entry=${encodeURIComponent(entryId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: Thread) => {
          if (!live) return;
          setData(d);
          loadUnread();
        })
        .catch(() => live && setError("대화를 불러오지 못했습니다."));
    load();
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      t = setTimeout(() => {
        if (!document.hidden) load();
        tick();
      }, liveOn() ? POLL_LIVE : POLL);
    };
    tick();
    // The live signal for this thread (a new message, or the other side read mine): fetch right away.
    const off = onLive((k) => entryOfKey(k) === entryId && load());
    return () => {
      live = false;
      clearTimeout(t);
      off();
    };
  }, [entryId]);

  const messages = [...(data?.messages ?? []), ...pending];

  // Stay at the newest message when one arrives, unless the reader scrolled up to read older ones.
  const total = messages.length;
  const lastMine = !!messages.at(-1)?.mine;
  useLayoutEffect(() => {
    const el = list.current;
    if (!el || total === count.current) return;
    const first = count.current === 0;
    count.current = total;
    if (first || near.current || lastMine) el.scrollTop = el.scrollHeight;
    else setBelow(true);
  }, [total, lastMine]);

  const onScroll = () => {
    const el = list.current!;
    near.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    if (near.current && below) setBelow(false);
  };
  const toBottom = () => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setBelow(false);
  };

  // The box grows with what is typed, up to about six lines.
  const fit = () => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  async function send() {
    const el = box.current!;
    const v = el.value.trim();
    if (!v) return;
    setError("");
    // Shown right away, dimmed, until the server has it.
    const temp: Msg = { id: `tmp-${Date.now()}`, from: side, name: "나", text: v, at: new Date().toISOString(), mine: true, pending: true };
    setPending((p) => [...p, temp]);
    el.value = "";
    unsaved.saved();
    fit();
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId, text: v }) }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    setPending((p) => p.filter((m) => m.id !== temp.id));
    if (!res?.ok) {
      setError(d?.error ?? "보내지 못했습니다. 연결을 확인해 주세요.");
      if (!el.value) el.value = v; // give the text back to try again
      unsaved.onInput();
      fit();
      return;
    }
    setData(d);
  }

  const readAts = (data?.readAts ?? []).map((x) => (x ? Date.parse(x) : 0));
  const behind = (m: Msg) => readAts.filter((t) => t < Date.parse(m.at)).length;
  const who = (m: Msg) => (m.from === "staff" && side === "creator" ? `스텔라이즈 ${m.name}` : m.name);

  return (
    <section aria-label={title || "대화"} className={`relative flex flex-col bg-white ${fill ? "h-full" : "border border-line"}`}>
      {title && <h4 className="border-b border-line px-4 py-3 text-[15px] font-bold text-ink-900">{title}</h4>}
      <div ref={list} onScroll={onScroll} role="log" aria-live="polite" aria-label="메시지" className={`overflow-y-auto overscroll-contain bg-[#f7f8fa] px-4 py-3 ${fill ? "min-h-[50vh] flex-1 md:min-h-0" : "h-80"}`}>
        {data === null ? (
          <p className="flex h-full items-center justify-center text-[14px] text-ink-600">불러오는 중…</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-[15px] font-semibold text-ink-800">아직 대화가 없습니다</p>
            <p className="text-[14px] text-ink-600">{side === "staff" && !data.joined ? "크리에이터가 아직 가입하지 않았습니다. 보낸 메시지는 가입한 뒤에 보입니다." : "첫 메시지를 보내 보세요."}</p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
              const sameAs = (o: Msg | undefined) => !!o && o.mine === m.mine && o.name === m.name && Math.abs(Date.parse(o.at) - Date.parse(m.at)) < GROUP_MS && dayKey(o.at) === dayKey(m.at);
              const first = !sameAs(prev);
              const last = !sameAs(next);
              const unread = m.mine && !m.pending ? behind(m) : 0;
              return (
                <li key={m.id} className={first ? "mt-3 first:mt-0" : "mt-1"}>
                  {newDay && (
                    <p className="mb-3 flex items-center gap-3 text-[12px] font-semibold text-ink-600 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                      {dayLabel.format(new Date(m.at))}
                    </p>
                  )}
                  <div className={`flex items-end gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
                    {!m.mine && (first ? <Initial name={m.name} /> : <span aria-hidden className="w-8 shrink-0" />)}
                    <div className={`flex min-w-0 max-w-[78%] flex-col ${m.mine ? "items-end" : "items-start"}`}>
                      {!m.mine && first && <span className="mb-1 text-[13px] font-semibold text-ink-800">{who(m)}</span>}
                      <div className={`flex items-end gap-1.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                        <p
                          className={`min-w-0 whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-relaxed motion-safe:animate-[msg-in_160ms_ease-out] ${
                            m.mine ? `rounded-[18px] bg-primary-600 text-white ${last ? "rounded-br-[6px]" : ""}` : `rounded-[18px] bg-white text-ink-900 ring-1 ring-line ${last ? "rounded-bl-[6px]" : ""}`
                          } ${m.pending ? "opacity-60" : ""}`}
                        >
                          <Linked text={m.text} mine={m.mine} />
                        </p>
                        <span className={`flex shrink-0 flex-col pb-0.5 text-[11px] leading-tight tabular-nums ${m.mine ? "items-end" : "items-start"}`}>
                          {unread > 0 && (
                            <span className="text-[12px] font-bold text-primary-700" title={`${unread}명이 아직 읽지 않았습니다`}>
                              {unread}
                              <span className="sr-only">명 안 읽음</span>
                            </span>
                          )}
                          {m.pending ? <span className="text-ink-600">보내는 중…</span> : last && <time dateTime={m.at} className="text-ink-600">{clock.format(new Date(m.at))}</time>}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {below && (
        <button type="button" onClick={toBottom} className="absolute bottom-[88px] left-1/2 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(40,42,58,0.25)] hover:bg-ink-800">
          새 메시지 ↓
        </button>
      )}
      <form
        className="flex items-end gap-2 border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor={`chat-${entryId}`} className="sr-only">
          보낼 메시지
        </label>
        <textarea
          ref={box}
          id={`chat-${entryId}`}
          name="message"
          autoComplete="off"
          onInput={() => (fit(), box.current?.value.trim() ? unsaved.onInput() : unsaved.saved())}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter starts a new line. Not while composing Korean.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="메시지 입력…"
          aria-describedby={`chat-${entryId}-hint`}
          className="max-h-40 min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-line bg-[#f7f8fa] px-4 py-2.5 text-[15px] leading-normal text-ink-900 placeholder:text-ink-600 focus:border-primary-600 focus:bg-white focus:outline-none"
        />
        <button type="submit" aria-label="보내기" className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
          </svg>
        </button>
      </form>
      <p id={`chat-${entryId}-hint`} className="hidden px-4 pb-2 text-[12px] text-ink-600 md:block">
        Enter 보내기 · Shift+Enter 줄바꿈
      </p>
      {error && (
        <p role="alert" className="px-4 pb-3 text-[14px] font-semibold text-danger-700">
          {error}
        </p>
      )}
    </section>
  );
}
