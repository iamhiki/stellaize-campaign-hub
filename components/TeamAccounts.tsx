"use client";
import { useEffect, useState } from "react";
import { setMe, useMe } from "@/lib/me";
import { Loading, ui } from "./PageBand";

type Account = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  role: "staff" | "creator" | "dev";
  createdAt: string;
  lastLoginAt: string | null;
};
type Role = Account["role"];
const ROLE = { staff: "담당자", dev: "개발자", creator: "크리에이터" } as const;
/** Order of the groups under "전체", and of the filter buttons. */
const ORDER: Role[] = ["creator", "staff", "dev"];

/** "2026.11.19 14:05" in Korea time. */
const when = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

/**
 * 마이페이지, developers only (11/19 비밀번호·아이디 찾기): every account's login mail, so a developer can tell a
 * teammate their ID, and a one-time link to set a new password, handed over by 카톡 while no mail service is set up.
 */
export function TeamAccounts() {
  const me = useMe();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState("");
  const dev = me?.role === "dev";

  useEffect(() => {
    if (!dev) return;
    fetch("/api/accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { accounts: Account[] }) => setAccounts(d.accounts))
      .catch(() => setError("계정 목록을 불러오지 못했습니다."));
  }, [dev]);

  if (!dev) return null;

  async function makeLink(a: Account) {
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: a.id }),
    }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    if (!res?.ok || !d?.link) return setError(d?.error ?? "링크를 만들지 못했습니다.");
    setLinks((l) => ({ ...l, [a.id]: d.link }));
  }

  async function remove(a: Account) {
    const what = a.role === "creator" ? "캠페인의 크리에이터 줄은 남고 연결만 끊기며, 배송 정보와 서류는 지워집니다." : "이 이름은 캠페인 담당자에서 빠집니다.";
    if (
      !window.confirm(`${a.name} (${a.email}) 계정을 지울까요?

바로 로그아웃되고 되돌릴 수 없습니다. ${what}`)
    )
      return;
    setError("");
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: a.id }),
    }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    if (!res?.ok) return setError(d?.error ?? "계정을 지우지 못했습니다.");
    setAccounts((list) => list && list.filter((x) => x.id !== a.id));
  }

  async function rename(ev: React.FormEvent<HTMLFormElement>, a: Account) {
    ev.preventDefault();
    const name = String(new FormData(ev.currentTarget).get("name") ?? "").trim();
    setError("");
    const res = await fetch("/api/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.id, name }) }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    if (!res?.ok) return setError(d?.error ?? "이름을 바꾸지 못했습니다.");
    setAccounts((list) => list && list.map((x) => (x.id === a.id ? { ...x, name: d.name } : x)));
    setRenaming("");
    // My own name is in the header too.
    if (a.id === me?.id) setMe({ ...me, name: d.name });
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(links[id]);
      setCopied(id);
    } catch {
      setCopied("");
    }
  }

  const needle = q.trim();
  const found = (accounts ?? []).filter((a) => !needle || a.name.includes(needle) || a.nickname.includes(needle) || a.email.includes(needle.toLowerCase()));
  const count = (r: Role | "all") => (r === "all" ? found.length : found.filter((a) => a.role === r).length);
  // "전체" shows every role, split into its own block; a single role is one plain list.
  const groups = (role === "all" ? ORDER : [role]).map((r) => ({ role: r, items: found.filter((a) => a.role === r) })).filter((g) => role !== "all" || g.items.length > 0);

  const row = (a: Account) => (
    <li key={a.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-4">
      <div className="min-w-48 flex-1">
        {renaming === a.id ? (
          <form onSubmit={(ev) => rename(ev, a)} className="flex flex-wrap items-center gap-2">
            <input autoComplete="off" name="name" defaultValue={a.name} required maxLength={30} autoFocus aria-label={`${a.name} 님의 새 이름`} className={`${ui.input} h-10 min-w-0 flex-1`} />
            <button type="submit" className={`${ui.primary} h-10 px-4 text-[14px]`}>
              저장
            </button>
            <button type="button" onClick={() => setRenaming("")} className={`${ui.secondary} h-10 px-4 text-[14px]`}>
              취소
            </button>
          </form>
        ) : (
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[16px] font-bold text-ink-900 wrap-anywhere">
            {a.name}
            {a.nickname && <span className="text-[14px] font-semibold text-ink-600">{a.nickname}</span>}
            <button type="button" onClick={() => setRenaming(a.id)} className="text-[13px] font-semibold text-ink-800 underline underline-offset-4 hover:text-primary-600">
              이름 바꾸기
            </button>
          </p>
        )}
        <p className="mt-1 break-all text-[15px] text-ink-800">{a.email}</p>
        <p className="mt-1 text-[13px] tabular-nums text-ink-600">
          가입 {a.createdAt} · 마지막 로그인 {a.lastLoginAt ? when(a.lastLoginAt) : "기록 없음"}
        </p>
      </div>
      {links[a.id] ? (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <input readOnly value={links[a.id]} onFocus={(e) => e.currentTarget.select()} aria-label={`${a.name} 님 재설정 링크`} className={`${ui.input} h-10 min-w-0 flex-1 text-[13px] md:w-80`} />
          <button type="button" onClick={() => copy(a.id)} className={`${ui.primary} h-10 px-4 text-[14px]`}>
            {copied === a.id ? "복사됨" : "링크 복사"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => makeLink(a)}
            disabled={a.id === me.id}
            className={`${ui.secondary} h-10 px-4 text-[14px] disabled:opacity-40`}
            title={a.id === me.id ? "내 비밀번호는 오른쪽 비밀번호 변경에서 바꿉니다" : undefined}
          >
            비밀번호 재설정 링크 만들기
          </button>
          {a.id !== me.id && (
            <button type="button" onClick={() => remove(a)} className="h-10 px-3 text-[14px] font-semibold text-danger-700 underline underline-offset-4 hover:text-danger-700/80">
              계정 지우기
            </button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <section className="md:col-span-2">
      <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink-900">팀원 계정 (개발자만 보임)</h2>
      <p className="mt-2 text-[15px] text-ink-600">
        아이디(로그인 이메일)를 잊은 사람에게는 이메일을 알려 주고, 비밀번호를 잊은 사람에게는 재설정 링크를 만들어 카톡 등으로 보내 주세요. 링크는 24시간 동안 한 번만 쓸 수 있고, 새로 만들면 전에
        만든 링크는 못 씁니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름, 별명, 이메일로 찾기…" aria-label="계정 찾기" className={`${ui.input} w-full max-w-sm`} />
        <div role="group" aria-label="역할" className="grid w-full grid-cols-4 border border-line sm:flex sm:w-fit">
          {(["all", ...ORDER] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className="min-h-10 whitespace-nowrap px-2 text-[13px] font-semibold tabular-nums text-ink-800 hover:text-primary-600 aria-pressed:bg-ink-900 aria-pressed:text-white sm:px-4 sm:text-[14px]"
            >
              {r === "all" ? "전체" : ROLE[r]} {accounts ? count(r) : ""}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      {!accounts ? (
        <div className="mt-5">
          <Loading />
        </div>
      ) : groups.every((g) => g.items.length === 0) ? (
        <p className="mt-5 border-t-2 border-ink-900 py-8 text-center text-[15px] text-ink-600">찾는 계정이 없습니다.</p>
      ) : (
        groups.map((g) => (
          <div key={g.role} className="mt-6">
            {role === "all" && (
              <h3 className="mb-2 text-[17px] font-bold text-ink-900">
                {ROLE[g.role]} <span className="ml-1 text-[14px] font-semibold tabular-nums text-ink-600">{g.items.length}</span>
              </h3>
            )}
            <ul className="border-t-2 border-ink-900">{g.items.map(row)}</ul>
          </div>
        ))
      )}
    </section>
  );
}
