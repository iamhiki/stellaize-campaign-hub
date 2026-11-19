"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCampaign, editCampaign, useCampaigns } from "@/lib/store";
import type { Campaign } from "@/lib/campaigns";
import { useMe } from "@/lib/me";
import { useUnsaved } from "@/lib/unsaved";
import { ComboInput } from "./ComboInput";
import { DateInput } from "./DateInput";
import { OwnersField } from "./OwnersField";
import { ui } from "./PageBand";

const CHANNELS = ["인스타그램 릴스", "인스타그램 피드", "유튜브", "유튜브 쇼츠", "틱톡", "블로그"];

// Inline, not a modal: the form opens above the list and the new campaign opens right after saving,
// where its creators get added. With `campaign` it edits that campaign in place (기획자 11/19: 담당자가 중간에 바뀜).
export function CampaignForm({ onClose, campaign }: { onClose: () => void; campaign?: Campaign }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const myName = useMe()?.name ?? "";
  const unsaved = useUnsaved();
  // The usual channels, then any other channel already used on a campaign (예: "유튜브 · 인스타그램").
  const used = (useCampaigns() ?? []).map((c) => c.channel);
  const channels = [...CHANNELS, ...[...new Set(used)].filter((c) => !CHANNELS.includes(c)).sort((a, b) => a.localeCompare(b, "ko"))];

  function submit(form: FormData) {
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const input = {
      name: get("name"),
      advertiser: get("advertiser"),
      channel: get("channel"),
      uploadDate: get("uploadDate"),
      owners: [...new Set([...form.getAll("owners").map((v) => String(v).trim()), get("ownerDraft")].filter(Boolean))],
      confidential: form.get("confidential") === "on",
    };
    if (!input.name || !input.advertiser || !input.channel || !input.uploadDate) return setError("캠페인 이름, 광고주, 채널, 업로드 날짜를 모두 입력해 주세요.");
    if (input.owners.length === 0) return setError("담당자를 한 명 이상 입력해 주세요.");
    if (campaign) {
      if (campaign.confidential && !input.owners.includes(myName) && !confirm("담당자에서 내 이름을 빼면 대외비 캠페인이라 저장한 뒤로 이 캠페인을 볼 수 없습니다. 저장할까요?")) return;
      editCampaign(campaign.id, { name: input.name, advertiser: input.advertiser, channel: input.channel, uploadDate: input.uploadDate, owners: input.owners });
      unsaved.saved();
      return onClose();
    }
    const id = addCampaign(input);
    unsaved.saved();
    router.push(`/campaigns/${id}`);
  }

  return (
    <form action={submit} onInput={unsaved.onInput} aria-labelledby="campaign-form-title" className="border-t-2 border-ink-900 bg-[#f5f7fa] px-5 py-7 md:px-8">
      <h2 id="campaign-form-title" className="text-[20px] font-bold tracking-[-0.03em] text-ink-900">
        {campaign ? "캠페인 정보 수정" : "캠페인 등록"}
      </h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <label className={ui.label}>
          캠페인 이름
          <input autoComplete="off" name="name" required defaultValue={campaign?.name} placeholder="예: 글로우핏 수분 선크림" className={ui.input} />
        </label>
        <label className={ui.label}>
          광고주
          <input autoComplete="off" name="advertiser" required defaultValue={campaign?.advertiser} className={ui.input} />
        </label>
        <label className={ui.label}>
          채널
          <ComboInput name="channel" label="채널" defaultValue={campaign?.channel} options={channels} placeholder="골라서 입력" />
        </label>
        <label className={ui.label}>
          업로드 날짜
          <DateInput name="uploadDate" defaultValue={campaign?.uploadDate} clearable={false} aria-describedby="upload-hint" />
          <span id="upload-hint" className="text-[13px] font-normal text-ink-600">
            크리에이터마다 다르면 상세 화면의 마감 설정에서 바꿉니다
          </span>
        </label>
      </div>
      <OwnersField key={myName} initial={campaign ? campaign.owners : myName ? [myName] : []} />
      {!campaign && (
      <label className="mt-5 flex items-start gap-2 text-[15px] font-medium text-ink-800">
        <input type="checkbox" name="confidential" className="mt-0.5 size-5 shrink-0 accent-primary-600" />
        <span>
          대외비 캠페인
          <span className="block text-[13px] font-normal text-ink-600">위 담당자에 적힌 사람만 봅니다. 이름이 계정 이름과 같아야 합니다.</span>
        </span>
      </label>
      )}
      {error && (
        <p role="alert" className="mt-4 text-[15px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className={ui.primary}>
          {campaign ? "저장" : "등록하고 크리에이터 추가하기"}
        </button>
        <button type="button" onClick={onClose} className={ui.secondary}>
          취소
        </button>
      </div>
    </form>
  );
}
