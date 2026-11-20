"use client";
import { useEffect, useState } from "react";
import { daysBetween } from "@/lib/date";
import type { CreatorItem } from "@/lib/server/creator";
import { useToday } from "@/lib/store";
import { DdayText } from "./badges";
import { ChatPanel } from "./ChatPanel";
import { PushToggle } from "./PushToggle";
import { CreatorProfile } from "./CreatorProfile";
import { Loading, pageWrap, table, ui } from "./PageBand";
import { MAX_UPLOAD_BYTES, UPLOAD_ACCEPT, sizeText } from "@/lib/uploads";
import { uploadFile } from "@/lib/upload-client";
import { useUnsaved } from "@/lib/unsaved";

const short = (d: string) => d.slice(5).replace("-", "/");
const WHO = { creator: "내 차례", advertiser: "광고주 확인 중", us: "스텔라이즈팀 확인 중" };
// The same party squares staff see (badges.tsx WAITING), from the creator's side.
const SQUARE = { creator: "bg-party-creator", advertiser: "bg-party-advertiser", us: "bg-primary-500" };
// Phone layout for a table cell: the row carries the rule and padding, not each cell.
const CELL = "max-md:border-b-0 max-md:px-0 max-md:py-0";
type Choice = { entryId: string; label: string };

// 기획자 11/11: 크리에이터는 자기 할 일만 본다. 협의한 일정과 마감, 기획안·가편안·수정본 제출.
export function CreatorHome() {
  const today = useToday();
  // undefined = loading, null = couldn't load
  const [items, setItems] = useState<CreatorItem[] | null | undefined>(undefined);
  // Only a developer account gets choices: the rows it can look at as their creator would (read-only).
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [entry, setEntry] = useState("");
  const [saved, setSaved] = useState(0); // bumps when the creator saves their info, to pick up the 정산 서류 check

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/creator${entry ? `?entry=${encodeURIComponent(entry)}` : ""}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((d: { items: CreatorItem[]; choices?: Choice[] } | null) => {
          if (!live) return;
          setItems((old) => d?.items ?? old ?? null);
          if (d?.choices) setChoices(d.choices);
        });
    load();
    window.addEventListener("focus", load);
    return () => {
      live = false;
      window.removeEventListener("focus", load);
    };
  }, [entry, saved]);

  // The header's 새 메시지 list links to /creator#chat-<entry id>: scroll to that conversation once it's on screen.
  const loaded = !!items;
  useEffect(() => {
    if (!loaded) return;
    const go = () => {
      const m = window.location.hash.match(/^#chat-(.+)$/);
      if (m) document.getElementById(`chat-${decodeURIComponent(m[1])}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [loaded]);

  if (choices)
    return (
      <main className={pageWrap}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-5">
          <label className="flex w-full min-w-0 flex-wrap items-center gap-3 text-[15px] font-semibold text-ink-900 md:w-auto">
            개발자 미리보기
            <select value={entry} onChange={(ev) => setEntry(ev.target.value)} className={`${ui.input} h-11 w-full min-w-0 text-[15px] font-normal md:w-[440px]`}>
              <option value="">크리에이터를 고르세요</option>
              {choices.map((c) => (
                <option key={c.entryId} value={c.entryId}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[14px] text-ink-600">고른 크리에이터가 로그인했을 때 보는 화면입니다. 보기 전용이라 제출은 할 수 없고, 제출 버튼 자리만 표시됩니다. 실제로 제출해 보려면 크리에이터 계정으로 로그인하세요.</p>
        </div>
        {/* Nothing picked yet: only the prompt, so the empty shipping form doesn't look like the whole page. */}
        {entry ? (
          <>
            <CreatorProfile preview />
            {(items ?? []).map((item) => (
              <Campaign key={item.entryId} item={item} today={today} onChange={setItems} preview />
            ))}
          </>
        ) : (
          <p className="border-t-2 border-ink-900 py-14 text-center text-[17px] font-semibold text-ink-800">위 ‘개발자 미리보기’에서 크리에이터를 고르면 그 사람의 내 일정 화면(단계 표, 기획안 양식, 제출 자리)이 나옵니다.</p>
        )}
      </main>
    );

  if (items === undefined)
    return (
      <main className={`${pageWrap} py-10`}>
        <Loading />
      </main>
    );
  if (items === null)
    return (
      <main className={`${pageWrap} py-10`}>
        <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">일정을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</p>
      </main>
    );
  if (items.length === 0)
    return (
      <main className={`${pageWrap} py-10`}>
        <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">참여 중인 캠페인이 없습니다. 담당자가 보낸 초대 링크를 열면 여기에 나타납니다.</p>
      </main>
    );

  return (
    <main className={pageWrap}>
      <CreatorProfile onSaved={() => setSaved((n) => n + 1)} />
      {items.map((item) => (
        <Campaign key={item.entryId} item={item} today={today} onChange={setItems} />
      ))}
      {/* 앱 알림 (11/19): creators have no 마이페이지, so it sits under their campaigns. */}
      <div className="border-t border-line py-10">
        <PushToggle compact />
      </div>
    </main>
  );
}

function Campaign({ item, today, onChange, preview }: { item: CreatorItem; today: string; onChange: (items: CreatorItem[]) => void; preview?: boolean }) {
  const late = item.steps.filter((s) => s.waits === "creator" && !s.done && s.due && today && daysBetween(today, s.due) < 0);
  return (
    <section className="py-10 md:py-12" aria-labelledby={`c-${item.entryId}`}>
      <h2 id={`c-${item.entryId}`} className="text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:text-[32px]">
        {item.campaign}
      </h2>
      <p className="mt-1 text-[15px] text-ink-600">
        {item.advertiser} · {item.channel}
      </p>
      {/* 기획자 11/14: 본인 최종단가는 보여 준다. PA 단가가 비어 있으면 최종단가에 포함된 것. */}
      {(item.price != null || item.tracking) && (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[15px]">
          {item.price != null && (
            <>
              <div>
                <dt className="inline text-ink-600">최종단가 </dt>
                <dd className="inline font-bold tabular-nums text-ink-900">{item.price.toLocaleString("ko-KR")}원</dd>
              </div>
              <div>
                <dt className="inline text-ink-600">PA 광고 1개월 </dt>
                <dd className="inline font-semibold tabular-nums text-ink-900">{item.paPrice == null ? "단가 내 포함" : item.paPrice === 0 ? "무료" : `${item.paPrice.toLocaleString("ko-KR")}원`}</dd>
              </div>
            </>
          )}
          {item.tracking && (
            <div>
              <dt className="inline text-ink-600">운송장 </dt>
              <dd className="inline font-semibold tabular-nums text-ink-900">{item.tracking}</dd>
            </div>
          )}
        </dl>
      )}
      {late.length > 0 && (
        <p role="alert" className="mt-5 border-l-4 border-danger-700 py-1 pl-4 text-[16px] font-semibold text-danger-700">
          마감이 지났습니다: {late.map((s) => `${s.label.replace(" 수급", "")} (${short(s.due!)})`).join(", ")}. 제출하거나 담당자에게 일정을 알려 주세요.
        </p>
      )}
      {/* Creators open this on a phone. Below md each step is a stacked block (step + state, deadline, hand-in),
          so the hand-in button is never off-screen behind a sideways scroll. */}
      <div className="mt-6">
        <table className={`${table.wrap} max-md:block max-md:min-w-0`}>
          <thead className="max-md:sr-only">
            <tr>
              {["단계", "마감", "상태", "제출"].map((h) => (
                <th key={h} scope="col" className={table.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-md:block">
            {item.steps.map((s) => {
              const mine = item.submissions.filter((x) => x.step === s.step);
              return (
                <tr key={s.step} className={`max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:border-b max-md:border-line max-md:px-3 max-md:py-4 ${s.next ? "bg-primary-100" : ""}`}>
                  <th scope="row" className={`${table.td} ${CELL} whitespace-nowrap text-left font-semibold text-ink-900`}>
                    <span className="mr-2 text-[12px] font-medium tabular-nums text-ink-600">{String(s.step + 1).padStart(2, "0")}</span>
                    {s.label}
                  </th>
                  <td className={`${table.td} ${CELL} whitespace-nowrap tabular-nums max-md:col-span-2 max-md:row-start-2 max-md:text-[14px]`}>
                    <span className="mr-1.5 text-ink-600 md:hidden">마감</span>
                    {s.due ? (
                      <>
                        {s.due}
                        {!s.done && today && <DdayText days={daysBetween(today, s.due)} />}
                      </>
                    ) : (
                      <span className="text-ink-600">미정</span>
                    )}
                  </td>
                  <td className={`${table.td} ${CELL} whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:text-[14px]`}>
                    {s.done ? (
                      <span className="text-ink-600">완료 {short(s.done)}</span>
                    ) : s.next ? (
                      <b className="inline-flex items-center gap-1.5 font-bold text-ink-900">
                        <span aria-hidden className={`size-2 shrink-0 ${SQUARE[s.waits]}`} />
                        {WHO[s.waits]}
                      </b>
                    ) : (
                      <span className="text-ink-600">예정</span>
                    )}
                  </td>
                  <td className={`${table.td} ${CELL} max-md:col-span-2 ${s.submit || mine.length > 0 ? "max-md:pt-1.5" : "max-md:hidden"}`}>
                    {/* 기획안 양식 (기획자 11/20): download it, or hand in any other format. */}
                    {s.label === "기획안 수급" && item.template && (
                      <p className="mb-3 text-[14px] text-ink-800">
                        <a href={`/api/files?template=${encodeURIComponent(item.campaignId)}`} className="inline-flex min-h-9 items-center gap-1.5 border border-line bg-white px-3 font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-700">
                          <span aria-hidden>↓</span> 기획안 양식 내려받기
                        </a>
                        <span className="ml-2 text-[13px] text-ink-600">
                          {item.template.name} · 양식에 맞춰 쓰거나, 다른 형식으로 내도 됩니다
                        </span>
                      </p>
                    )}
                    {mine.length > 0 && (
                      <ul className="mb-3 space-y-1">
                        {mine.map((x) => (
                          <Handed key={x.id} x={x} />
                        ))}
                      </ul>
                    )}
                    {s.submit && !preview ? (
                      <SubmitForm entryId={item.entryId} step={s.step} label={s.label.replace(" 수급", "")} again={mine.length > 0} onChange={onChange} />
                    ) : s.submit ? (
                      // 개발자 미리보기: where the creator's 제출 button sits, without letting anyone hand in for them.
                      <span className="inline-flex h-11 w-full items-center justify-center border border-dashed border-line-strong px-4 text-[14px] font-semibold text-ink-600 md:-my-1.5 md:h-9 md:w-auto">
                        {s.label.replace(" 수급", "")} 제출 버튼 자리 (미리보기라 누를 수 없음)
                      </span>
                    ) : (
                      mine.length === 0 && <span className="text-ink-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* 기획자 11/19: 사이트 안에서 담당자와 대화. Not in the developer preview, which is read-only. */}
      {!preview && (
        <div id={`chat-${item.entryId}`} className="mt-8 max-w-2xl scroll-mt-24">
          <ChatPanel entryId={item.entryId} side="creator" title="스텔라이즈 담당자와 대화" />
        </div>
      )}
    </section>
  );
}

type Mode = "file" | "link" | "text";
const MODES: [Mode, string][] = [
  ["file", "파일 올리기"],
  ["link", "링크로 내기"],
  ["text", "글로 쓰기"],
];

/** One hand-in, as the creator sees it in their list. */
function Handed({ x }: { x: CreatorItem["submissions"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="text-[14px]">
      <span className="mr-2 tabular-nums text-ink-600">{short(x.at)}</span>
      {x.file ? (
        <a href={`/api/files?sub=${encodeURIComponent(x.id)}`} className="break-all font-semibold text-primary-700 underline underline-offset-4 hover:text-primary-600">
          {x.file.name}
          <span className="ml-1 font-normal text-ink-600 no-underline">({sizeText(x.file.size)})</span>
        </a>
      ) : x.text ? (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="font-semibold text-primary-700 underline underline-offset-4 hover:text-primary-600">
            글로 제출 {open ? "접기" : "보기"}
          </button>
          {open && <p className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap border-l-2 border-line pl-3 text-ink-800 wrap-anywhere">{x.text}</p>}
        </>
      ) : (
        <a href={x.url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-primary-700 underline underline-offset-4 hover:text-primary-600">
          {x.url}
        </a>
      )}
      {x.note && <span className="block text-ink-600">{x.note}</span>}
    </li>
  );
}

/**
 * 기획안·가편안·수정본 제출 (기획자 11/20: 플랫폼 안에서 업로드). A file goes straight into storage (progress
 * shown), or a link (큰 영상은 드라이브·유튜브 일부 공개), or text typed here (텍스트로 막 주면).
 */
function SubmitForm({ entryId, step, label, again, onChange }: { entryId: string; step: number; label: string; again: boolean; onChange: (items: CreatorItem[]) => void }) {
  const video = label !== "기획안";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("file");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const unsaved = useUnsaved();

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={again ? "min-h-9 text-[14px] text-ink-600 underline underline-offset-4 hover:text-primary-600" : "inline-flex h-11 w-full items-center justify-center border border-line bg-white px-4 text-[14px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600 md:-my-1.5 md:h-9 md:w-auto"}>
        {again ? "다시 제출" : `${label} 제출`}
      </button>
    );

  async function hand(payload: Record<string, unknown>) {
    const res = await fetch("/api/creator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId, step, ...payload }) }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    if (!res?.ok || !d?.items) throw new Error(d?.error ?? "제출하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    unsaved.saved();
    onChange(d.items);
    setOpen(false);
  }

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    const note = String(form.get("note") ?? "");
    try {
      if (mode === "file") {
        const file = form.get("file");
        if (!(file instanceof File) || !file.size) throw new Error("올릴 파일을 골라 주세요.");
        setPct(0);
        const up = await uploadFile(file, { purpose: "sub", entryId, step }, setPct);
        await hand({ file: up, note });
      } else if (mode === "link") await hand({ url: String(form.get("url") ?? ""), note });
      else await hand({ text: String(form.get("text") ?? ""), note });
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출하지 못했습니다.");
    }
    setPct(null);
    setBusy(false);
  }

  return (
    <form action={submit} onInput={unsaved.onInput} aria-label={`${label} 제출`} className="flex max-w-[560px] flex-col gap-2">
      <div role="group" aria-label="제출 방법" className="grid grid-cols-3 border border-line text-[13px] font-semibold">
        {MODES.map(([m, text]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => (setMode(m), setError(""))} className="min-h-10 border-line text-ink-800 not-last:border-r hover:text-primary-700 aria-pressed:bg-ink-900 aria-pressed:text-white">
            {text}
          </button>
        ))}
      </div>
      {mode === "file" && (
        <>
          <input name="file" type="file" required accept={UPLOAD_ACCEPT} aria-label={`${label} 파일`} className="block w-full text-[14px] text-ink-800 file:mr-3 file:h-10 file:border file:border-line file:bg-white file:px-4 file:font-semibold file:text-ink-800 hover:file:border-primary-600" />
          <p className="text-[13px] text-ink-600">
            {video ? "영상(mp4·mov 등)" : "워드·PDF·한글·PPT·텍스트·이미지"} 등 어떤 형식이든 올릴 수 있습니다. 파일 하나에 {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB까지입니다.
            {video && " 더 큰 영상은 드라이브나 유튜브(일부 공개)에 올리고 ‘링크로 내기’를 써 주세요."}
          </p>
        </>
      )}
      {mode === "link" && (
        <>
          <input autoComplete="off" name="url" type="url" required maxLength={1000} aria-label={`${label} 링크`} placeholder="https://  (드라이브, 유튜브 일부 공개 등 링크)" className={`${ui.input} h-10 text-[14px]`} />
          <p className="text-[13px] text-ink-600">담당자가 열어 볼 수 있게 링크 공유 권한을 확인해 주세요.</p>
        </>
      )}
      {mode === "text" && <textarea autoComplete="off" name="text" required maxLength={10000} rows={8} aria-label={`${label} 내용`} placeholder={`${label} 내용을 자유롭게 적어 주세요…`} className="min-w-0 border border-line bg-white px-4 py-3 text-[15px] leading-relaxed text-ink-900 placeholder:text-ink-600 focus:border-primary-600 focus:outline-none" />}
      <input autoComplete="off" name="note" maxLength={500} aria-label="메모" placeholder="메모 (선택)" className={`${ui.input} h-10 text-[14px]`} />
      {pct !== null && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-[13px] tabular-nums text-ink-600">
          <span className="h-1.5 flex-1 bg-[#e6e8eb]">
            <span className="block h-full bg-primary-600 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
          </span>
          {pct < 100 ? `올리는 중… ${pct}%` : "마무리하는 중…"}
        </div>
      )}
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${ui.primary} h-10 px-4 text-[14px]`}>
          {busy ? "제출하는 중…" : "제출"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={`${ui.secondary} h-10 px-4 text-[14px]`}>
          취소
        </button>
      </div>
    </form>
  );
}
