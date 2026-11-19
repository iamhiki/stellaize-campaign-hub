"use client";
import { useState } from "react";
import { TEAM } from "@/lib/demo";
import { post, setMe, useMe, type Me } from "@/lib/me";
import { ui } from "./PageBand";

const ROLE = { staff: "담당자", dev: "개발자", creator: "크리에이터" } as const;

export function AccountInfo() {
  const me = useMe();
  const rows = [
    ["역할", me ? ROLE[me.role] : undefined],
    ["소속", me && me.role !== "creator" ? TEAM : undefined],
    ["이메일", me?.email],
  ].filter(([k, v]) => k !== "소속" || v || !me);
  return (
    <dl className="mt-5 border-t-2 border-ink-900 text-[16px]">
      <div className="flex border-b border-line py-4">
        <dt className="w-28 shrink-0 pt-px text-ink-600">이름</dt>
        <dd className="min-h-6 min-w-0 flex-1">
          {me && <NameField me={me} />}
        </dd>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex border-b border-line py-4">
          <dt className="w-28 shrink-0 text-ink-600">{k}</dt>
          <dd className="min-h-6 break-all font-semibold text-ink-900">
            {v ?? ""}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** My name, with 바꾸기. For staff the name is also their 담당 mark on campaigns; the server moves that along. */
function NameField({ me }: { me: Me }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const name = String(
      new FormData(ev.currentTarget).get("name") ?? "",
    ).trim();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.me)
        return setError(d?.error ?? "이름을 바꾸지 못했습니다.");
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
        <span className="break-all font-semibold text-ink-900">{me.name}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[14px] font-semibold text-ink-800 underline underline-offset-4 hover:text-primary-600"
        >
          바꾸기
        </button>
      </div>
    );
  return (
    <form onSubmit={save}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          defaultValue={me.name}
          required
          maxLength={30}
          autoFocus
          aria-label="새 이름"
          className={`${ui.input} h-10 min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={busy}
          className={`${ui.primary} h-10 px-4 text-[14px]`}
        >
          {busy ? "저장 중" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => (setEditing(false), setError(""))}
          className={`${ui.secondary} h-10 px-4 text-[14px]`}
        >
          취소
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 text-[15px] font-semibold text-danger-700"
        >
          {error}
        </p>
      )}
      {me.role !== "creator" && (
        <p className="mt-2 text-[14px] text-ink-600">
          팀원끼리 알아보도록 본명으로 적어 주세요. 별명은 괄호로 붙입니다(예: 홍가영(까엉이)). 캠페인의 담당자 이름도 함께
          바뀝니다.
        </p>
      )}
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
    if (v.get("next") !== v.get("again"))
      return setError("새 비밀번호와 확인이 서로 다릅니다.");
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
    <form
      onSubmit={submit}
      className="mt-5 flex flex-col gap-5 border-t-2 border-ink-900 pt-6"
    >
      <label className={ui.label}>
        현재 비밀번호
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        새 비밀번호
        <input
          name="next"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        새 비밀번호 확인
        <input
          name="again"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={ui.input}
        />
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
