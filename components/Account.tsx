"use client";
import { useState } from "react";
import { TEAM } from "@/lib/demo";
import { post, useMe } from "@/lib/me";
import { ui } from "./PageBand";

export function AccountInfo() {
  const me = useMe();
  const rows = [
    ["이름", me?.name],
    ["소속", me ? TEAM : undefined],
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
    </dl>
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
    const problem = await post("/api/auth/password", { current: v.get("current"), next: v.get("next") });
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
