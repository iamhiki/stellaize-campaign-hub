"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { liveOn, onLive, startLive } from "@/lib/live";
import { ui } from "./PageBand";

type Msg = { id: string; from: "staff" | "creator"; name: string; text: string; at: string; mine: boolean };


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

const time = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
  const t = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
  return `${day} ${t}`;
};

/**
 * One thread: 크리에이터 ↔ 담당자 (기획자 11/19) or 1:1 팀원 대화. `side` is who is looking; the server marks which
 * messages are theirs (right side). Staff see who on the team wrote each message; the creator sees it as from 스텔라이즈.
 */
/** `fill`: take the height of the box it is in (the 대화 tab) instead of a fixed-height card. */
export function ChatPanel({ entryId, side, title, fill }: { entryId: string; side: "staff" | "creator"; title: string; fill?: boolean }) {
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [joined, setJoined] = useState(true);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/chat?entry=${encodeURIComponent(entryId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: { messages: Msg[]; joined: boolean }) => {
          if (!live) return;
          setMessages(d.messages);
          setJoined(d.joined);
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
    // The live signal for this thread: fetch right away.
    const off = onLive((k) => entryOfKey(k) === entryId && load());
    return () => {
      live = false;
      clearTimeout(t);
      off();
    };
  }, [entryId]);

  // Stay at the newest message when one arrives.
  useEffect(() => {
    if (!messages || messages.length === count.current) return;
    count.current = messages.length;
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);

  async function send() {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId, text: v }) }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    setBusy(false);
    if (!res?.ok) return setError(d?.error ?? "보내지 못했습니다. 연결을 확인해 주세요.");
    setMessages(d.messages);
    setText("");
  }

  return (
    <section aria-label={title || "대화"} className={`flex flex-col bg-white ${fill ? "h-full" : "border border-line"}`}>
      {title && <h4 className="border-b border-line px-4 py-3 text-[15px] font-bold text-ink-900">{title}</h4>}
      <div ref={list} role="log" aria-live="polite" className={`flex flex-col gap-3 overflow-y-auto px-4 py-4 ${fill ? "min-h-[50vh] flex-1 md:min-h-0" : "max-h-80 min-h-40"}`}>
        {messages === null ? (
          <p className="m-auto text-[14px] text-ink-600">불러오는 중입니다.</p>
        ) : messages.length === 0 ? (
          <p className="m-auto text-center text-[14px] text-ink-600">
            아직 대화가 없습니다.
            {side === "staff" && !joined && <span className="mt-1 block">크리에이터가 아직 가입하지 않았습니다. 보낸 메시지는 가입한 뒤에 보입니다.</span>}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.mine;
            const who = m.from === "staff" && side === "creator" ? `스텔라이즈 ${m.name}` : m.name;
            return (
              <div key={m.id} className={`flex max-w-[85%] flex-col ${mine ? "items-end self-end" : "items-start self-start"}`}>
                <span className="mb-1 text-[12px] text-ink-600">
                  {mine ? "나" : who} · {time(m.at)}
                </span>
                <p className={`whitespace-pre-wrap break-words px-3 py-2 text-[15px] leading-relaxed ${mine ? "bg-primary-600 text-white" : "bg-[#f0f2f5] text-ink-900"}`}>{m.text}</p>
              </div>
            );
          })
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter starts a new line. Not while composing Korean.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="메시지 입력 (Enter 보내기, Shift+Enter 줄바꿈)"
          aria-label="보낼 메시지"
          className="min-h-12 min-w-0 flex-1 resize-y border border-line px-3 py-2 text-[15px] text-ink-900 placeholder:text-ink-600 focus:border-primary-600 focus:outline-none"
        />
        <button type="submit" disabled={busy || !text.trim()} className={`${ui.primary} h-12 px-5 disabled:opacity-40`}>
          보내기
        </button>
      </form>
      {error && (
        <p role="alert" className="px-4 pb-3 text-[14px] font-semibold text-danger-700">
          {error}
        </p>
      )}
    </section>
  );
}
