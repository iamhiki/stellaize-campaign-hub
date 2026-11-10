"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCampaign } from "@/lib/store";
import { CURRENT_USER } from "@/lib/demo";
import { ui } from "./PageBand";

const CHANNELS = ["인스타그램 릴스", "인스타그램 피드", "유튜브", "유튜브 쇼츠", "틱톡", "블로그"];

// Inline, not a modal: the form opens above the list and the new campaign opens right after saving,
// where its creators get added.
export function CampaignForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(form: FormData) {
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const input = {
      name: get("name"),
      advertiser: get("advertiser"),
      channel: get("channel"),
      uploadDate: get("uploadDate"),
      owners: get("owners").split(/[,،、\s]+/).filter(Boolean),
    };
    if (!input.name || !input.advertiser || !input.channel || !input.uploadDate) return setError("캠페인 이름, 광고주, 채널, 업로드 날짜를 모두 입력해 주세요.");
    if (input.owners.length === 0) return setError("담당자를 한 명 이상 입력해 주세요.");
    const id = addCampaign(input);
    router.push(`/campaigns/${id}`);
  }

  return (
    <form action={submit} aria-labelledby="new-campaign" className="border-t-2 border-ink-900 bg-[#f5f7fa] px-5 py-7 md:px-8">
      <h2 id="new-campaign" className="text-[20px] font-bold tracking-[-0.03em] text-ink-900">
        캠페인 등록
      </h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <label className={ui.label}>
          캠페인 이름
          <input name="name" required placeholder="예: 글로우핏 수분 선크림" className={ui.input} />
        </label>
        <label className={ui.label}>
          광고주
          <input name="advertiser" required className={ui.input} />
        </label>
        <label className={ui.label}>
          채널
          <input name="channel" required list="channel-options" placeholder="골라서 입력" className={ui.input} />
          <datalist id="channel-options">
            {CHANNELS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className={ui.label}>
          업로드 날짜
          <input name="uploadDate" type="date" required aria-describedby="upload-hint" className={`${ui.input} tabular-nums`} />
          <span id="upload-hint" className="text-[13px] font-normal text-ink-600">
            크리에이터마다 다르면 상세 화면의 마감 설정에서 바꿉니다
          </span>
        </label>
        <label className={ui.label}>
          담당자
          <input name="owners" required defaultValue={CURRENT_USER.name} aria-describedby="owners-hint" className={ui.input} />
          <span id="owners-hint" className="text-[13px] font-normal text-ink-600">
            여러 명이면 쉼표로 구분
          </span>
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-[15px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className={ui.primary}>
          등록하고 크리에이터 추가하기
        </button>
        <button type="button" onClick={onClose} className={ui.secondary}>
          취소
        </button>
      </div>
    </form>
  );
}
