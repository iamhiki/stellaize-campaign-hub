"use client";
import { useState } from "react";
import { STEPS, type Entry, type Submission } from "@/lib/campaigns";
import { sizeText } from "@/lib/uploads";

const short = (d: string) => d.slice(5).replace("-", "/");
const act = "inline-flex min-h-9 items-center gap-1.5 border border-line bg-white px-3 text-[13px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-700";

/**
 * Every 기획안·가편안·수정본 a creator handed in, newest first (기획자 11/20: 받아서 광고주한테 넘긴다). A file
 * downloads, or becomes a link for the advertiser (7 days, no login); text can be copied as is.
 */
export function Handins({ entry, list }: { entry: Entry; list: Submission[] }) {
  const rows = [...list].sort((a, b) => b.at.localeCompare(a.at) || b.step - a.step);
  if (rows.length === 0) return <p className="text-[14px] text-ink-600">{entry.name} 님이 아직 제출한 것이 없습니다.</p>;
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-[14px] text-ink-800">
        <b className="font-bold text-ink-900">{entry.name}</b> 제출본 {rows.length}개. 파일은 내려받거나 광고주용 링크로 넘깁니다.
      </p>
      <ul className="border-t-2 border-ink-900 bg-white">
        {rows.map((x) => (
          <Row key={x.id} x={x} />
        ))}
      </ul>
    </div>
  );
}

function Row({ x }: { x: Submission }) {
  const [link, setLink] = useState<{ url: string; until: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied("");
    }
  };
  async function share() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subId: x.id }) }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    setBusy(false);
    if (!res?.ok || !d?.link) return setError(d?.error ?? "링크를 만들지 못했습니다.");
    setLink({ url: d.link, until: d.until });
  }
  const label = STEPS[x.step]?.label.replace(" 수급", "") ?? "";
  return (
    <li className="border-b border-line px-4 py-3">
      <p className="flex flex-wrap items-baseline gap-x-3 text-[13px] text-ink-600">
        <b className="text-[14px] font-bold text-ink-900">{label}</b>
        <span className="tabular-nums">{short(x.at)}</span>
        <span>{x.file ? "파일" : x.text ? "글" : "링크"}</span>
      </p>
      <div className="mt-1.5 text-[15px] text-ink-900">
        {x.file ? (
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold wrap-anywhere">{x.file.name}</span>
            <span className="text-[13px] tabular-nums text-ink-600">{sizeText(x.file.size)}</span>
          </p>
        ) : x.text ? (
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap border-l-2 border-line pl-3 leading-relaxed text-ink-800 wrap-anywhere">{x.text}</p>
        ) : (
          <a href={x.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 underline underline-offset-4 wrap-anywhere hover:text-primary-600">
            {x.url}
          </a>
        )}
        {x.note && <p className="mt-1 text-[14px] text-ink-600">메모: {x.note}</p>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {x.file && (
          <>
            <a href={`/api/files?sub=${encodeURIComponent(x.id)}`} className={act}>
              <span aria-hidden>↓</span> 내려받기
            </a>
            <button type="button" onClick={share} disabled={busy} className={act}>
              {busy ? "만드는 중…" : link ? "광고주용 링크 다시 만들기" : "광고주용 링크 만들기"}
            </button>
          </>
        )}
        {x.text && (
          <button type="button" onClick={() => copy("text", x.text!)} className={act}>
            {copied === "text" ? "복사됨" : "글 복사"}
          </button>
        )}
        {!x.file && !x.text && (
          <button type="button" onClick={() => copy("url", x.url)} className={act}>
            {copied === "url" ? "복사됨" : "링크 복사"}
          </button>
        )}
      </div>
      {link && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} aria-label="광고주용 링크" className="h-9 min-w-0 flex-1 border border-line bg-[#f7f8fa] px-3 text-[13px] text-ink-900" />
          <button type="button" onClick={() => copy("share", link.url)} className={act}>
            {copied === "share" ? "복사됨" : "복사"}
          </button>
          <p className="w-full text-[12px] text-ink-600">
            로그인 없이 이 파일 하나만 내려받는 링크입니다. {new Date(link.until).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })}까지 열립니다. 메일이나 카톡으로 광고주에게 보내세요.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-danger-700">
          {error}
        </p>
      )}
    </li>
  );
}
