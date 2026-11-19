"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUnreadSummary } from "./ChatPanel";

/**
 * 허브 안 알림 (기획자 11/19): unread messages in the header, on every screen, and as "(3)" in the tab title.
 * Opens a list of the threads with new messages; each goes straight to that conversation.
 */
export function ChatBell() {
  const { threads } = useUnreadSummary();
  const total = threads.reduce((n, t) => n + t.n, 0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // "(3) 캠페인 │ Campaign Hub" while something is unread, so it shows in a background tab too.
  // Next sets the title on every page change, so keep the count on whatever title is there now.
  useEffect(() => {
    const apply = () => {
      const now = document.title;
      if (!now) return; // the page hasn't set its title yet
      const base = now.replace(/^\(\d+\) /, "");
      const want = total ? `(${total}) ${base}` : base;
      if (now !== want) document.title = want;
    };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      watch.disconnect();
      const base = document.title.replace(/^\(\d+\) /, "");
      if (base !== document.title) document.title = base;
    };
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={total ? `새 메시지 ${total}개` : "새 메시지 없음"}
        className="relative flex size-9 items-center justify-center hover:opacity-80"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M4 5.5h16v10.5H9.5L5 19.5V16H4z" />
        </svg>
        {total > 0 && (
          <span className="absolute -right-1 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center bg-danger-700 px-1 text-[11px] font-bold leading-none text-white tabular-nums">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(320px,calc(100vw-2.5rem))] border border-line bg-white text-ink-900 shadow-[0_12px_32px_rgba(40,42,58,0.16)]">
          <p className="border-b border-line px-4 py-3 text-[14px] font-bold">새 메시지</p>
          {threads.length === 0 ? (
            <p className="px-4 py-6 text-center text-[14px] text-ink-600">새 메시지가 없습니다.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {threads.map((t) => (
                <li key={t.entryId}>
                  <Link
                    href={`/chat#${encodeURIComponent(t.entryId)}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-primary-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{t.title}</span>
                      {t.sub && <span className="block truncate text-[12px] text-ink-600">{t.sub}</span>}
                    </span>
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center bg-danger-700 px-1.5 text-[11px] font-bold text-white tabular-nums">{t.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
