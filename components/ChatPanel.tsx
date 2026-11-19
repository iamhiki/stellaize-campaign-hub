"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ui } from "./PageBand";

type Msg = { id: string; from: "staff" | "creator"; name: string; text: string; at: string };

const POLL = 5_000; // an open thread asks for new messages this often
const UNREAD_POLL = 20_000;

// ---- unread counts (entry id → messages from the other side not read yet), shared by every badge on a page ----
let unread: Record<string, number> = {};
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function loadUnread() {
  if (document.hidden) return;
  fetch("/api/chat", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { unread: Record<string, number> } | null) => {
      if (!d) return;
      unread = d.unread;
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}
function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    loadUnread();
    timer = setInterval(loadUnread, UNREAD_POLL);
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) clearInterval(timer);
  };
}
const EMPTY: Record<string, number> = {};
/** Unread messages per creator row, refreshed every 20 seconds. */
export const useUnread = () => useSyncExternalStore(subscribe, () => unread, () => EMPTY);

const time = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
  const t = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
  return `${day} ${t}`;
};

/**
 * One 크리에이터 ↔ 담당자 thread (기획자 11/19). `side` is who is looking: their own messages sit on the right.
 * Staff see who on the team wrote each message; the creator sees it as from 스텔라이즈.
 */
export function ChatPanel({ entryId, side, title }: { entryId: string; side: "staff" | "creator"; title: string }) {
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
    const t = setInterval(() => !document.hidden && load(), POLL);
    return () => {
      live = false;
      clearInterval(t);
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
    <section aria-label={title} className="flex flex-col border border-line bg-white">
      <h4 className="border-b border-line px-4 py-3 text-[15px] font-bold text-ink-900">{title}</h4>
      <div ref={list} role="log" aria-live="polite" className="flex max-h-80 min-h-40 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages === null ? (
          <p className="m-auto text-[14px] text-ink-600">불러오는 중입니다.</p>
        ) : messages.length === 0 ? (
          <p className="m-auto text-center text-[14px] text-ink-600">
            아직 대화가 없습니다.
            {side === "staff" && !joined && <span className="mt-1 block">크리에이터가 아직 가입하지 않았습니다. 보낸 메시지는 가입한 뒤에 보입니다.</span>}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.from === side;
            const who = m.from === "staff" ? (side === "staff" ? m.name : `스텔라이즈 ${m.name}`) : m.name;
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
