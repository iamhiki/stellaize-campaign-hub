"use client";
import { useRef, useState } from "react";
import type { Campaign } from "@/lib/campaigns";
import { reload } from "@/lib/store";
import { uploadFile } from "@/lib/upload-client";
import { UPLOAD_ACCEPT, sizeText } from "@/lib/uploads";

const act = "inline-flex min-h-9 items-center gap-1.5 border border-line bg-white px-3 text-[13px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-700 disabled:opacity-50";

/**
 * 기획안 양식 (기획자 11/20: 양식을 플랫폼에 등록해 놓고 "이대로 작성해 주세요"). One file per campaign. Creators
 * see a download button at their 기획안 step and may still hand in any format.
 */
export function TemplateBox({ campaign }: { campaign: Campaign }) {
  const t = campaign.template;
  const pick = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function put(file: File) {
    setError("");
    setPct(0);
    try {
      const up = await uploadFile(file, { purpose: "template", campaignId: campaign.id }, setPct);
      const res = await fetch("/api/template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id, file: up }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "양식을 저장하지 못했습니다.");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "양식을 올리지 못했습니다.");
    }
    setPct(null);
  }

  async function remove() {
    if (!window.confirm("기획안 양식을 지울까요? 크리에이터 화면의 양식 내려받기도 사라집니다.")) return;
    await fetch("/api/template", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }) }).catch(() => null);
    reload();
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-[#f7f8fa] px-4 py-3 text-[14px]">
      <span className="font-bold text-ink-900">기획안 양식</span>
      {t ? (
        <span className="min-w-0 text-ink-800 wrap-anywhere">
          {t.name} <span className="text-[13px] tabular-nums text-ink-600">({sizeText(t.size)} · {t.at.slice(5).replace("-", "/")} 올림)</span>
        </span>
      ) : (
        <span className="text-ink-600">없음. 올려 두면 크리에이터가 기획안 단계에서 내려받아 씁니다.</span>
      )}
      <span className="flex flex-wrap gap-1.5">
        {t && (
          <a href={`/api/files?template=${encodeURIComponent(campaign.id)}`} className={act}>
            <span aria-hidden>↓</span> 내려받기
          </a>
        )}
        <button type="button" disabled={pct !== null} onClick={() => pick.current?.click()} className={act}>
          {pct !== null ? (pct < 100 ? `올리는 중… ${pct}%` : "마무리하는 중…") : t ? "바꾸기" : "양식 올리기"}
        </button>
        {t && (
          <button type="button" onClick={remove} disabled={pct !== null} className="min-h-9 px-2 text-[13px] font-semibold text-ink-600 underline underline-offset-4 hover:text-danger-700">
            지우기
          </button>
        )}
      </span>
      <input
        ref={pick}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) put(f);
        }}
      />
      {error && (
        <p role="alert" className="w-full text-[13px] font-semibold text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
