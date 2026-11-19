"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useCampaigns, useStaffNames } from "@/lib/store";
import { ui } from "./PageBand";

const MAX = 10; // same limits as the server (lib/ops.ts parseInput)
const MAX_LEN = 30;

/**
 * 담당자 list for 캠페인 등록/수정: one item per person with its own 빼기 button, and a combo box to add the next one
 * (기획자 11/19: 쉼표 대신 항목 추가, 가입한 사람은 목록에서 고르기). Names of signed-up 담당자 accounts come first;
 * names only used on other campaigns follow. Each name goes into the form as its own `owners` value.
 */
export function OwnersField({ initial }: { initial: string[] }) {
  const [owners, setOwners] = useState(initial);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  const signedUp = useStaffNames();
  const used = (useCampaigns() ?? []).flatMap((c) => c.owners);
  const q = draft.trim();
  const options = [
    ...signedUp.map((name) => ({ name, joined: true })),
    ...[...new Set(used)].filter((n) => !signedUp.includes(n)).sort((a, b) => a.localeCompare(b, "ko")).map((name) => ({ name, joined: false })),
  ].filter((o) => !owners.includes(o.name) && (!q || o.name.includes(q)));

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function add(raw: string) {
    const name = raw.trim();
    if (!name) return;
    if (owners.includes(name)) return setNote(`${name} 님은 이미 담당자에 있습니다.`);
    if (name.length > MAX_LEN) return setNote(`이름은 ${MAX_LEN}자까지 넣을 수 있습니다.`);
    if (owners.length >= MAX) return setNote(`담당자는 ${MAX}명까지 넣을 수 있습니다.`);
    setOwners([...owners, name]);
    setDraft("");
    setNote(signedUp.length && !signedUp.includes(name) ? `${name} 님은 아직 가입하지 않은 이름입니다. 가입할 때 같은 이름을 쓰면 연결됩니다.` : "");
    setActive(0);
  }

  return (
    <fieldset className="mt-5">
      <legend className="text-[15px] font-medium text-ink-800">담당자</legend>
      {owners.map((n) => (
        <input key={n} type="hidden" name="owners" value={n} />
      ))}
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="담당자 목록">
        {owners.map((n) => (
          <li key={n} className="inline-flex h-10 items-center gap-1 border border-line bg-white pl-3 text-[15px] font-semibold text-ink-900">
            {n}
            <button
              type="button"
              onClick={() => setOwners(owners.filter((o) => o !== n))}
              aria-label={`${n} 님 담당자에서 빼기`}
              className="inline-flex size-10 items-center justify-center text-[18px] text-ink-600 hover:text-danger-700"
            >
              ×
            </button>
          </li>
        ))}
        {owners.length === 0 && <li className="flex h-10 items-center text-[15px] text-ink-600">아직 담당자가 없습니다. 아래에서 추가해 주세요.</li>}
      </ul>
      <div className="mt-3 flex max-w-md gap-2">
        <div ref={box} className="relative min-w-0 flex-1">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Escape") setOpen(false);
            else if (e.key === "Enter") {
              // Enter adds a name instead of submitting the whole form: the highlighted one, or what was typed.
              e.preventDefault();
              add(open && options[active] ? options[active].name : draft);
            }
          }}
          name="ownerDraft" // a name typed but not yet added still counts when the form is saved
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="이름을 고르거나 입력"
          aria-label="추가할 담당자 이름"
          aria-describedby="owners-hint"
          className={`${ui.input} w-full`}
        />
        {open && options.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="담당자 후보"
            className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto border border-line bg-white py-1 shadow-[0_12px_32px_rgba(40,42,58,0.16)]"
          >
            {options.map((o, i) => (
              <li
                key={o.name}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerDown={(e) => e.preventDefault()} // keep focus in the box
                onClick={() => add(o.name)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 px-4 text-[15px] text-ink-900 ${i === active ? "bg-primary-100" : ""}`}
              >
                <span className="font-semibold">{o.name}</span>
                <span className={`text-[12px] ${o.joined ? "text-primary-700" : "text-ink-600"}`}>{o.joined ? "가입함" : "다른 캠페인 담당"}</span>
              </li>
            ))}
          </ul>
        )}
        </div>
        <button type="button" onClick={() => add(draft)} className={ui.secondary}>
          + 추가
        </button>
      </div>
      <p id="owners-hint" role={note ? "status" : undefined} className={`mt-2 text-[13px] ${note ? "font-semibold text-ink-800" : "text-ink-600"}`}>
        {note || "가입한 담당자는 목록에서 고르면 됩니다. 계정 이름과 같아야 그 사람의 “내 담당”에 모입니다."}
      </p>
    </fieldset>
  );
}
