"use client";
import { useState } from "react";
import { reminderDraft, type Campaign, type Entry } from "@/lib/campaigns";
import { post } from "@/lib/me";
import { reload, useAccounts, useEmails, useMail, useToday } from "@/lib/store";
import { ui } from "./PageBand";

const field = "min-w-0 border border-line bg-white px-3 text-[14px] text-ink-900 placeholder:text-ink-600 focus:border-primary-600 focus:outline-none";
const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-800";

/**
 * 11/14: 마감 알림 메일은 자동으로 나가지 않는다. Staff press 메일 보내기, see the draft, change what they want,
 * and send. Inline under the row, not a modal.
 */
export function MailForm({ campaign, entry, onClose }: { campaign: Campaign; entry: Entry; onClose: () => void }) {
  const today = useToday();
  const email = useEmails()[entry.id] ?? "";
  const account = useAccounts()[entry.id];
  const mail = useMail();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const draft = reminderDraft(campaign, entry, account ?? entry.name, today);

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    const get = (k: string) => String(form.get(k) ?? "");
    const failed = await post("/api/mail", { campaignId: campaign.id, entryId: entry.id, step: draft.step, to: get("to").trim(), cc: get("cc"), subject: get("subject"), text: get("text") });
    setBusy(false);
    if (failed) return setError(failed);
    setSent(true);
    reload();
  }

  if (sent)
    return (
      <p role="status" className="flex flex-wrap items-center gap-4 text-[14px] font-semibold text-ink-900">
        {entry.name} 님에게 메일을 보냈습니다.
        <button type="button" onClick={onClose} className="min-h-9 font-normal text-ink-600 underline underline-offset-4 hover:text-primary-600">
          닫기
        </button>
      </p>
    );

  return (
    <form action={submit} aria-label={`${entry.name} 마감 알림 메일`} className="flex max-w-[720px] flex-col gap-4">
      <div className="border border-line bg-white p-4 text-[13px] leading-relaxed text-ink-800">
        <p>
          <b className="font-bold text-ink-900">{entry.name}</b> 님에게 보낼 마감 알림 메일입니다. 아래 내용이 그대로 나가고, 보내기 전에 받는 사람·제목·내용을 고칠 수 있습니다. 메일은 자동으로 나가지 않고 이 버튼을 눌렀을 때만 나갑니다.
        </p>
        <p className="mt-1">
          참조에는 소속사 담당자 메일(넣어 둔 경우)이 들어 있습니다.{mail.teamCc ? ` 팀 메일(${mail.teamCc})은 따로 적지 않아도 항상 참조됩니다.` : " 팀 메일을 설정하면 항상 참조됩니다."}
        </p>
        {!mail.ready && (
          <p className="mt-2 font-semibold text-danger-700">
            보낼 메일 계정이 아직 연결되지 않아, 지금은 보내기를 눌러도 메일이 나가지 않습니다. 연결 방법은 README의 &ldquo;마감 알림 메일&rdquo;에 있습니다.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          받는 사람
          <input key={email} name="to" type="email" required maxLength={120} defaultValue={email} placeholder={email ? "" : "크리에이터가 아직 가입하지 않았습니다. 주소를 직접 넣으세요"} className={`${field} h-10`} />
        </label>
        <label className={label}>
          참조
          <input name="cc" maxLength={400} defaultValue={entry.managerEmail ?? ""} placeholder="여러 개면 쉼표로" className={`${field} h-10`} />
        </label>
      </div>
      <label className={label}>
        제목
        <input name="subject" required maxLength={200} defaultValue={draft.subject} className={`${field} h-10`} />
      </label>
      <label className={label}>
        내용
        <textarea name="text" required maxLength={5000} rows={9} defaultValue={draft.text} className={`${field} py-2 leading-relaxed`} />
      </label>
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${ui.primary} h-10 px-5 text-[14px]`}>
          {busy ? "보내는 중" : "보내기"}
        </button>
        <button type="button" onClick={onClose} className={`${ui.secondary} h-10 px-5 text-[14px]`}>
          취소
        </button>
      </div>
    </form>
  );
}
