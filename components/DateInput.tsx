"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { addDays, todayKST } from "@/lib/date";

/**
 * Date field with the hub's own calendar. The browser's built-in date picker can't be styled and on Korean Windows
 * draws its calendar in a serif system font (기획자 11/19: 궁서체 같은 달력 말고). Values are "YYYY-MM-DD" like
 * <input type="date">. With `name` the value also goes into the surrounding form.
 */
type Props = {
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (v: string | null) => void;
  name?: string;
  id?: string;
  clearable?: boolean;
  size?: "md" | "sm";
  placeholder?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const label = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return `${y}. ${m}. ${d}. (${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
};

export function DateInput({ value, defaultValue, onChange, name, id, clearable = true, size = "md", placeholder = "날짜 선택", ...aria }: Props) {
  const [own, setOwn] = useState(defaultValue ?? null);
  const current = value !== undefined ? value || null : own;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const today = todayKST();
  const [focus, setFocus] = useState(current ?? today); // the day the keyboard is on
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const gridId = useId();

  function set(v: string | null) {
    if (value === undefined) setOwn(v);
    onChange?.(v);
    setOpen(false);
    button.current?.focus();
  }

  function show() {
    const r = button.current!.getBoundingClientRect();
    const h = 360, w = 296;
    // Fixed, so a table with overflow (단계별 마감) doesn't clip it. Opens upward when there's no room below.
    const top = r.bottom + 6 + h > window.innerHeight && r.top - 6 - h > 0 ? r.top - 6 - h : r.bottom + 6;
    setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) });
    setFocus(current ?? today);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const close = (e: Event) => !panel.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    panel.current?.querySelector<HTMLButtonElement>("[data-focus=true]")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Keep keyboard focus on the focused day as it moves.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLButtonElement>("[data-focus=true]")?.focus({ preventScroll: true });
  }, [focus, open]);

  const [fy, fm] = focus.split("-").map(Number);
  const year = fy, month = fm - 1;
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const start = addDays(ymd(year, month, 1), -first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const moveMonth = (n: number) => {
    const d = new Date(Date.UTC(year, month + n, 1));
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    setFocus(ymd(d.getUTCFullYear(), d.getUTCMonth(), Math.min(Number(focus.slice(8)), last)));
  };

  function keys(e: KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) setFocus(addDays(focus, step[e.key]));
    else if (e.key === "PageUp") moveMonth(-1);
    else if (e.key === "PageDown") moveMonth(1);
    else if (e.key === "Escape") {
      setOpen(false);
      button.current?.focus();
    } else return;
    e.preventDefault();
  }

  const h = size === "sm" ? "h-10 px-2 text-[14px]" : "h-12 px-4 text-[16px]";

  return (
    <>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
      <button
        ref={button}
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        className={`${h} flex w-full min-w-0 items-center justify-between gap-2 border bg-white text-left tabular-nums hover:border-line-strong focus:border-primary-600 focus:outline-none ${
          open ? "border-primary-600" : "border-line"
        } ${current ? "text-ink-900" : "text-ink-600"}`}
      >
        <span className="truncate">{current ? label(current) : placeholder}</span>
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-600" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4.5" width="14" height="12" rx="1" />
          <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={panel}
          role="dialog"
          aria-label="날짜 고르기"
          onKeyDown={keys}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-[296px] border border-line bg-white p-4 shadow-[0_12px_32px_rgba(40,42,58,0.16)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className="inline-flex size-9 items-center justify-center text-[18px] text-ink-800 hover:bg-[#f5f7fa] hover:text-primary-600">
              ‹
            </button>
            <p id={gridId} aria-live="polite" className="text-[16px] font-bold tracking-[-0.02em] text-ink-900 tabular-nums">
              {year}년 {month + 1}월
            </p>
            <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className="inline-flex size-9 items-center justify-center text-[18px] text-ink-800 hover:bg-[#f5f7fa] hover:text-primary-600">
              ›
            </button>
          </div>
          <div role="grid" aria-labelledby={gridId} className="grid grid-cols-7 text-center">
            {WEEK.map((w, i) => (
              <span key={w} role="columnheader" className={`pb-2 text-[12px] font-semibold ${i === 0 ? "text-danger-700" : "text-ink-600"}`}>
                {w}
              </span>
            ))}
            {days.map((d) => {
              const inMonth = Number(d.slice(5, 7)) === month + 1;
              const selected = d === current;
              const isToday = d === today;
              const sunday = new Date(d).getUTCDay() === 0;
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  tabIndex={d === focus ? 0 : -1}
                  data-focus={d === focus}
                  aria-selected={selected}
                  aria-label={`${label(d)}${isToday ? ", 오늘" : ""}`}
                  onClick={() => set(d)}
                  className={`mx-auto flex size-9 items-center justify-center text-[14px] tabular-nums ${
                    selected
                      ? "bg-primary-600 font-bold text-white"
                      : `hover:bg-primary-100 ${isToday ? "font-bold text-primary-700 ring-1 ring-inset ring-primary-600" : ""} ${
                          !inMonth ? "text-ink-600/50" : sunday ? "text-danger-700" : "text-ink-900"
                        }`
                  }`}
                >
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[14px] font-semibold">
            {clearable ? (
              <button type="button" onClick={() => set(null)} className="min-h-9 px-1 text-ink-600 hover:text-danger-700">
                지우기
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => set(today)} className="min-h-9 px-1 text-primary-600 hover:text-primary-700">
              오늘
            </button>
          </div>
        </div>
      )}
    </>
  );
}
