"use client";
import { useEffect, useState } from "react";
import { DOC_KINDS, DOC_LABEL } from "@/lib/files";
import type { Profile } from "@/lib/server/db";
import { ui } from "./PageBand";

const short = (d: string) => d.slice(5, 10).replace("-", "/");
const line = "min-h-9 text-[14px] text-ink-600 underline underline-offset-4 hover:text-primary-600";

/**
 * 기획자 11/14: 주소·연락처·통장사본·신분증을 크리에이터가 직접 올린다. One form per account, used by every
 * campaign the creator is in. Consent is asked here, when the data is handed over, not at sign-up.
 * shortcut: the consent wording is our draft, not a company-reviewed text. Have the company check it before real creators use this.
 */
export function CreatorProfile({ onSaved }: { onSaved: () => void }) {
  // undefined = loading
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/creator/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: { profile: Profile | null } | null) => setProfile(d?.profile ?? null));
  }, []);

  async function call(init: RequestInit, fallback: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/creator/profile", init);
      const d = await res.json().catch(() => null);
      if (res.ok && d) {
        setProfile(d.profile);
        setEditing(false);
        setConfirming(false);
        onSaved();
      } else setError(d?.error ?? fallback);
    } catch {
      setError("서버에 연결하지 못했습니다. 연결을 확인해 주세요.");
    }
    setBusy(false);
  }

  if (profile === undefined) return null;
  const missing = DOC_KINDS.filter((k) => !profile?.[k]);

  return (
    <section aria-labelledby="my-info" className="border-b border-line py-8">
      <h2 id="my-info" className="text-[20px] font-bold tracking-[-0.03em] text-ink-900">
        배송 정보 · 정산 서류
      </h2>

      {profile && !editing ? (
        <>
          <dl className="mt-4 grid max-w-[640px] grid-cols-[5.5em_1fr] gap-x-3 gap-y-1.5 text-[15px] text-ink-900">
            <dt className="text-ink-600">성함</dt>
            <dd>{profile.legalName}</dd>
            <dt className="text-ink-600">전화번호</dt>
            <dd className="tabular-nums">{profile.phone}</dd>
            <dt className="text-ink-600">배송 주소</dt>
            <dd>{profile.address}</dd>
            {DOC_KINDS.map((kind) => (
              <div key={kind} className="contents">
                <dt className="text-ink-600">{kind === "idDoc" ? "신분증" : "통장사본"}</dt>
                <dd>{profile[kind] ? `올림 (${short(profile[kind]!.at)})` : <span className="font-semibold text-danger-700">아직 올리지 않음</span>}</dd>
              </div>
            ))}
          </dl>
          {missing.length > 0 && <p className="mt-3 text-[14px] text-ink-800">{missing.map((k) => DOC_LABEL[k]).join(", ")}을(를) 올리면 정산 서류 제출이 끝납니다.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            <button type="button" onClick={() => setEditing(true)} className={line}>
              수정 · 서류 올리기
            </button>
            {confirming ? (
              <span role="group" aria-label="내 정보 삭제 확인" className="flex flex-wrap items-center gap-2 text-[14px] text-ink-800">
                배송 정보와 올린 서류를 모두 지울까요?
                <button type="button" disabled={busy} onClick={() => call({ method: "DELETE" }, "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.")} className="min-h-9 bg-danger-700 px-3 font-semibold text-white">
                  지우기
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="min-h-9 border border-line px-3 font-semibold text-ink-800">
                  취소
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={line}>
                내 정보 삭제
              </button>
            )}
          </div>
        </>
      ) : !profile && !editing ? (
        <>
          <p className="mt-3 max-w-[640px] text-[15px] text-ink-800">제품을 받을 주소와 정산에 필요한 서류를 여기에 한 번 올리면, 참여하는 모든 캠페인에 쓰입니다.</p>
          <button type="button" onClick={() => setEditing(true)} className={`${ui.secondary} mt-4 h-11 px-5 text-[15px]`}>
            배송 정보와 서류 올리기
          </button>
        </>
      ) : (
        <form
          aria-label="배송 정보와 정산 서류"
          className="mt-4 flex max-w-[560px] flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            call({ method: "POST", body: new FormData(ev.currentTarget) }, "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
          }}
        >
          <label className={ui.label}>
            성함 (실명)
            <input name="legalName" required maxLength={40} autoComplete="name" defaultValue={profile?.legalName} className={ui.input} />
          </label>
          <label className={ui.label}>
            전화번호
            <input name="phone" type="tel" required maxLength={20} autoComplete="tel" inputMode="tel" placeholder="010-0000-0000" defaultValue={profile?.phone} className={ui.input} />
          </label>
          <label className={ui.label}>
            제품 받을 주소
            <input name="address" required maxLength={200} autoComplete="street-address" placeholder="공동현관 비밀번호가 있으면 함께" defaultValue={profile?.address} className={ui.input} />
          </label>
          {DOC_KINDS.map((kind) => (
            <label key={kind} className={ui.label}>
              {DOC_LABEL[kind]} {profile?.[kind] && <span className="font-normal text-ink-600">올림 ({short(profile[kind]!.at)}). 새 파일을 고르면 바뀝니다.</span>}
              <input name={kind} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="text-[14px] text-ink-800 file:mr-3 file:h-10 file:border file:border-line file:bg-white file:px-4 file:text-[14px] file:font-semibold file:text-ink-800" />
            </label>
          ))}
          <p className="text-[13px] text-ink-600">PDF, JPG, PNG. 파일 하나에 5MB까지. 사업자는 사업자등록증, 개인은 신분증을 올립니다.</p>

          {!profile?.consentAt && (
            <fieldset className="border border-line bg-[#f5f7fa] p-4 text-[14px] leading-relaxed text-ink-800">
              <legend className="px-1 font-bold text-ink-900">개인정보 수집·이용 동의</legend>
              <ul className="list-disc space-y-1 pl-5">
                <li>수집하는 곳: 스텔라이즈팀</li>
                <li>목적: 광고 캠페인 계약, 대금 정산(세금계산서 또는 원천징수 처리), 제품 배송</li>
                <li>항목: 성함, 전화번호, 주소, 신분증 또는 사업자등록증 사본, 통장사본</li>
                <li>보관 기간: 정산이 끝난 날부터 5년. 이 화면의 &lsquo;내 정보 삭제&rsquo;를 누르면 허브에서는 바로 지워집니다.</li>
                <li>동의하지 않을 수 있습니다. 그 경우 이 화면으로는 제출할 수 없고, 담당자에게 따로 보내야 합니다.</li>
              </ul>
              <label className="mt-3 flex items-start gap-2 font-semibold text-ink-900">
                <input type="checkbox" name="consent" value="yes" required className="mt-0.5 size-5 shrink-0 accent-primary-600" />
                위 내용을 읽었고 동의합니다.
              </label>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="text-[14px] font-semibold text-danger-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={`${ui.primary} h-11 px-5 text-[15px]`}>
              {busy ? "저장하는 중" : "저장"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={`${ui.secondary} h-11 px-5 text-[15px]`}>
              취소
            </button>
          </div>
        </form>
      )}
      {error && !editing && (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-danger-700">
          {error}
        </p>
      )}
    </section>
  );
}
