"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ui } from "./PageBand";

/**
 * A text box with the hub's own suggestion list, for one value that can also be typed freely (채널).
 * Replaces <datalist>, whose popup the browser draws in its own style (기획자 11/19). Same look as the 담당자 list.
 */
export function ComboInput({ name, defaultValue = "", options, placeholder, label }: { name: string; defaultValue?: string; options: string[]; placeholder?: string; label: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [typed, setTyped] = useState(false); // filter only once the person starts typing, so the full list shows first
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = value.trim();
  const shown = typed && q ? options.filter((o) => o.includes(q)) : options;

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const pick = (v: string) => {
    setValue(v);
    setTyped(false);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input
        name={name}
        value={value}
        required
        onChange={(e) => {
          setValue(e.target.value);
          setTyped(true);
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter" && open && shown[active]) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Tab") setOpen(false);
        }}
        role="combobox"
        aria-label={label}
        aria-expanded={open && shown.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        className={`${ui.input} w-full pr-11`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => setOpen(!open)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-600 hover:text-primary-600"
      >
        <svg viewBox="0 0 20 20" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </button>
      {open && shown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} 후보`}
          className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto border border-line bg-white py-1 shadow-[0_12px_32px_rgba(40,42,58,0.16)]"
        >
          {shown.map((o, i) => (
            <li
              key={o}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o === value}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 px-4 text-[15px] text-ink-900 ${i === active ? "bg-primary-100" : ""} ${
                o === value ? "font-bold text-primary-700" : "font-semibold"
              }`}
            >
              {o}
              {o === value && <span aria-hidden className="text-[13px]">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
