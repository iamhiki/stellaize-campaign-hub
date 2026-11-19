"use client";
import type { Campaign, Entry } from "@/lib/campaigns";
import { DOC_KINDS, DOC_LABEL } from "@/lib/files";
import { isEmailOrEmpty } from "@/lib/ops";
import { setDeal, useProfiles } from "@/lib/store";

const field = "h-10 min-w-0 border border-line bg-white px-3 text-[14px] tabular-nums text-ink-900 placeholder:text-ink-600 focus:border-primary-600 focus:outline-none";
const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-800";
const won = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("ko-KR"));
/** "950,000원" → 950000; nothing typed → null. */
const digits = (v: FormDataEntryValue | null) => {
  const d = String(v ?? "").replace(/[^0-9]/g, "");
  return d ? Number(d) : null;
};

/**
 * 기획자 11/14: 최종단가(부킹 요청 때 다시 확인한 값), PA 광고 1개월 단가, 운송장. The creator sees these on 내 일정.
 * Below: the shipping info and documents the creator uploaded themselves. Saves when a box loses focus.
 */
export function DealEditor({ campaign, entry }: { campaign: Campaign; entry: Entry }) {
  const profile = useProfiles()[entry.id];

  function save(form: HTMLFormElement) {
    const f = new FormData(form);
    const price = digits(f.get("price"));
    const paPrice = digits(f.get("paPrice"));
    const tracking = String(f.get("tracking") ?? "").trim().slice(0, 40);
    const managerEmail = String(f.get("managerEmail") ?? "").trim();
    if (!isEmailOrEmpty(managerEmail)) return; // the box shows the browser's own "not an address" state; nothing is saved
    if (price === (entry.price ?? null) && paPrice === (entry.paPrice ?? null) && tracking === (entry.tracking ?? "") && managerEmail === (entry.managerEmail ?? "")) return;
    setDeal(campaign.id, entry.id, price, paPrice, tracking, managerEmail);
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="mb-4 text-[14px] text-ink-800">
        <b className="font-bold text-ink-900">{entry.name}</b> 단가와 배송. 칸을 벗어나면 저장되고, 크리에이터의 내 일정에 보입니다.
      </p>
      <form
        onBlur={(ev) => save(ev.currentTarget)}
        onSubmit={(ev) => {
          ev.preventDefault();
          save(ev.currentTarget);
        }}
        className="grid max-w-[720px] grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <label className={label}>
          최종단가 (원)
          <input autoComplete="off" name="price" inputMode="numeric" defaultValue={won(entry.price)} placeholder="예: 950,000" className={field} />
        </label>
        <label className={label}>
          PA 광고 1개월 단가 (원)
          <input autoComplete="off" name="paPrice" inputMode="numeric" defaultValue={won(entry.paPrice)} placeholder="비우면 단가 내 포함" className={field} />
        </label>
        <label className={label}>
          운송장 번호
          <input autoComplete="off" name="tracking" maxLength={40} defaultValue={entry.tracking ?? ""} placeholder="제품 발송 후" className={field} />
        </label>
        <label className={label}>
          소속사 담당자 메일
          <input autoComplete="off" name="managerEmail" type="email" maxLength={120} defaultValue={entry.managerEmail ?? ""} placeholder="있으면. 마감 알림 메일 참조" className={`${field} invalid:border-danger-700`} />
        </label>
      </form>

      {profile ? (
        <dl className="mt-5 grid max-w-[720px] grid-cols-[5.5em_1fr] gap-x-3 gap-y-1.5 text-[14px] text-ink-900">
          <dt className="text-ink-600">성함</dt>
          <dd>{profile.legalName}</dd>
          <dt className="text-ink-600">전화번호</dt>
          <dd className="tabular-nums">{profile.phone}</dd>
          <dt className="text-ink-600">배송 주소</dt>
          <dd>{profile.address}</dd>
          <dt className="text-ink-600">서류</dt>
          <dd className="flex flex-wrap gap-x-4 gap-y-1">
            {DOC_KINDS.map((kind) =>
              profile[kind] ? (
                <a key={kind} href={`/api/files?user=${encodeURIComponent(profile.userId)}&kind=${kind}`} className="font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700">
                  {DOC_LABEL[kind]} 내려받기
                </a>
              ) : (
                <span key={kind} className="text-ink-600">
                  {DOC_LABEL[kind]} 아직 없음
                </span>
              ),
            )}
          </dd>
        </dl>
      ) : (
        entry.creatorId && <p className="mt-4 text-[13px] text-ink-600">크리에이터가 아직 배송 정보와 서류를 올리지 않았습니다.</p>
      )}
    </div>
  );
}
