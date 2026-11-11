"use client";
import { useState } from "react";
import { STEPS, type Campaign, type Entry } from "@/lib/campaigns";
import { inviteCreator, unlinkCreator, useAccounts, useNotices } from "@/lib/store";

const short = (d: string) => d.slice(5).replace("-", "/");
const line = "text-[13px] text-ink-600 underline underline-offset-4 hover:text-primary-600";
const button = "min-h-10 border border-line bg-white px-4 text-[14px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600";

/**
 * 기획자 11/11: 크리에이터가 가입해서 자기 할 일만 본다. Staff make an invite link for one row; whoever signs up
 * through it is linked to that row. Shown in the row's 마감 · 초대 panel.
 */
export function CreatorAccess({ campaign, entry }: { campaign: Campaign; entry: Entry }) {
  const account = useAccounts()[entry.id];
  const notices = useNotices().filter((n) => n.entryId === entry.id);
  const [copied, setCopied] = useState(false);
  const link = entry.invite ? `${window.location.origin}/join?t=${entry.invite}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false); // http on the company network: the address is selected in the box to copy by hand
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="mb-3 text-[14px] text-ink-800">
        <b className="font-bold text-ink-900">{entry.name}</b> 크리에이터 계정. 가입한 크리에이터는 자기 일정과 마감만 보고, 기획안·가편안·수정본 링크를 제출합니다.
      </p>

      {entry.creatorId ? (
        <>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-900">
            <span>
              계정 연결됨{account ? `: ${account}` : ""}
            </span>
            <button type="button" onClick={() => unlinkCreator(campaign.id, entry.id)} className={line}>
              연결 해제
            </button>
          </p>
          {notices.length > 0 && (
            <ul className="mt-3 space-y-1 text-[13px] text-ink-800">
              {notices.map((n) => (
                <li key={n.id}>
                  마감 알림: {STEPS[n.step].label} (마감 {short(n.due)}) · {short(n.createdAt)} 크리에이터 화면에 표시 · {n.emailedAt ? `${short(n.emailedAt)} 메일 발송` : "메일은 아직 보내지 않음"}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : entry.invite ? (
        <div className="flex max-w-[720px] flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              readOnly
              value={link}
              aria-label={`${entry.name} 초대 링크`}
              onFocus={(ev) => ev.currentTarget.select()}
              className="h-10 min-w-0 flex-1 border border-line bg-white px-3 text-[13px] text-ink-900 focus:border-primary-600 focus:outline-none"
            />
            <button type="button" onClick={copy} className={button}>
              {copied ? "복사했습니다" : "복사"}
            </button>
          </div>
          <p className="flex flex-wrap gap-x-4 text-[13px] text-ink-600">
            <span>이 주소를 크리에이터에게 보내세요. 한 사람이 가입하면 더 쓸 수 없습니다.</span>
            <button type="button" onClick={() => inviteCreator(campaign.id, entry.id, false)} className={line}>
              초대 취소
            </button>
          </p>
        </div>
      ) : (
        <button type="button" onClick={() => inviteCreator(campaign.id, entry.id, true)} className={button}>
          초대 링크 만들기
        </button>
      )}
    </div>
  );
}
