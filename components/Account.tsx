"use client";
import { useState } from "react";
import { TEAM } from "@/lib/demo";
import { post, setMe, useMe, type Me } from "@/lib/me";
import { ui } from "./PageBand";

const ROLE = { staff: "담당자", dev: "개발자", creator: "크리에이터" } as const;

export function AccountInfo() {
  const me = useMe();
  const rows: [string, string | undefined][] = [
    ["이름", me?.name],
    ["역할", me ? ROLE[me.role] : undefined],
    ...(me?.role === "creator" ? [] : ([["소속", me ? TEAM : undefined]] as [string, string | undefined][])),
    ["이메일", me?.email],
  ];
  return (
    <dl className="mt-5 border-t-2 border-ink-900 text-[16px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex border-b border-line py-4">
          <dt className="w-28 shrink-0 text-ink-600">{k}</dt>
          <dd className="min-h-6 break-all font-semibold text-ink-900">{v ?? ""}</dd>
        </div>
      ))}
      <div className="flex border-b border-line py-4">
        <dt className="w-28 shrink-0 pt-px text-ink-600">별명</dt>
        <dd className="min-h-6 min-w-0 flex-1">{me && <NicknameField me={me} />}</dd>
      </div>
      {me && <p className="mt-3 text-[14px] text-ink-600">이름은 개발자가 바꿉니다. 고칠 게 있으면 개발자에게 알려 주세요.</p>}
    </dl>
  );
}

/** My 별명, with 바꾸기. The name is set by a developer; this is the part each person changes. */
function NicknameField({ me }: { me: Me }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const nickname = String(new FormData(ev.currentTarget).get("nickname") ?? "").trim();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname }) });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.me) return setError(d?.error ?? "별명을 바꾸지 못했습니다.");
      setMe(d.me);
      setEditing(false);
    } catch {
      setError("서버에 연결하지 못했습니다. 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing)
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {me.nickname ? <span className="break-all font-semibold text-ink-900">{me.nickname}</span> : <span className="text-ink-600">없음</span>}
        <button type="button" onClick={() => setEditing(true)} className="text-[14px] font-semibold text-ink-800 underline underline-offset-4 hover:text-primary-600">
          {me.nickname ? "바꾸기" : "정하기"}
        </button>
      </div>
    );
  return (
    <form onSubmit={save}>
      <div className="flex flex-wrap items-center gap-2">
        <input name="nickname" defaultValue={me.nickname} maxLength={20} autoFocus aria-label="별명" className={`${ui.input} h-10 min-w-0 flex-1`} />
        <button type="submit" disabled={busy} className={`${ui.primary} h-10 px-4 text-[14px]`}>
          {busy ? "저장 중" : "저장"}
        </button>
        <button type="button" onClick={() => (setEditing(false), setError(""))} className={`${ui.secondary} h-10 px-4 text-[14px]`}>
          취소
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[15px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      <p className="mt-2 text-[14px] text-ink-600">20자까지. 비우고 저장하면 별명이 없어집니다.</p>
    </form>
  );
}

export function PasswordForm() {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const v = new FormData(form);
    setSaved(false);
    if (v.get("next") !== v.get("again")) return setError("새 비밀번호와 확인이 서로 다릅니다.");
    setBusy(true);
    const problem = await post("/api/auth/password", {
      current: v.get("current"),
      next: v.get("next"),
    });
    setBusy(false);
    setError(problem);
    if (!problem) {
      setSaved(true);
      form.reset();
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-5 border-t-2 border-ink-900 pt-6">
      <label className={ui.label}>
        현재 비밀번호
        <input name="current" type="password" required autoComplete="current-password" className={ui.input} />
      </label>
      <label className={ui.label}>
        새 비밀번호
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className={ui.input} />
      </label>
      <label className={ui.label}>
        새 비밀번호 확인
        <input name="again" type="password" required minLength={8} autoComplete="new-password" className={ui.input} />
      </label>
      {error && (
        <p role="alert" className="text-[15px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-[15px] font-semibold text-ink-900">
          비밀번호를 바꿨습니다. 다른 기기에서는 다시 로그인해야 합니다.
        </p>
      )}
      <button type="submit" disabled={busy} className={ui.primary}>
        {busy ? "바꾸는 중" : "변경하기"}
      </button>
      <p className="text-[14px] text-ink-600">8자 이상으로 정합니다.</p>
    </form>
  );
}
