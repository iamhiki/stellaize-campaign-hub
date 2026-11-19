"use client";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";
import { Loading, ui } from "./PageBand";

type Account = { id: string; name: string; email: string; role: "staff" | "creator" | "dev"; createdAt: string };
const ROLE = { staff: "담당자", dev: "개발자", creator: "크리에이터" } as const;

/**
 * 마이페이지, developers only (11/19 비밀번호·아이디 찾기): every account's login mail, so a developer can tell a
 * teammate their ID, and a one-time link to set a new password, handed over by 카톡 while no mail service is set up.
 */
export function TeamAccounts() {
  const me = useMe();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [q, setQ] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
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
    const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.id }) }).catch(() => null);
    const d = res && (await res.json().catch(() => null));
    if (!res?.ok || !d?.link) return setError(d?.error ?? "링크를 만들지 못했습니다.");
    setLinks((l) => ({ ...l, [a.id]: d.link }));
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(links[id]);
      setCopied(id);
    } catch {
      setCopied("");
    }
  }

  const shown = (accounts ?? []).filter((a) => !q.trim() || a.name.includes(q.trim()) || a.email.includes(q.trim().toLowerCase()));

  return (
    <section className="md:col-span-2">
      <h2 className="text-[22px] font-bold tracking-[-0.03em] text-ink-900">팀원 계정 (개발자만 보임)</h2>
      <p className="mt-2 text-[15px] text-ink-600">
        아이디(로그인 이메일)를 잊은 사람에게는 이메일을 알려 주고, 비밀번호를 잊은 사람에게는 재설정 링크를 만들어 카톡 등으로 보내 주세요. 링크는 24시간 동안 한 번만 쓸 수 있고, 새로 만들면 전에 만든 링크는 못 씁니다.
      </p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름이나 이메일로 찾기" aria-label="계정 찾기" className={`${ui.input} mt-5 w-full max-w-sm`} />
      {error && (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-danger-700">
          {error}
        </p>
      )}
      {!accounts ? (
        <div className="mt-5">
          <Loading />
        </div>
      ) : (
        <ul className="mt-5 border-t-2 border-ink-900">
          {shown.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-4">
              <div className="min-w-48 flex-1">
                <p className="text-[16px] font-bold text-ink-900">
                  {a.name} <span className="ml-1 text-[13px] font-semibold text-ink-600">{ROLE[a.role]}</span>
                </p>
                <p className="mt-1 break-all text-[15px] text-ink-800">{a.email}</p>
              </div>
              {links[a.id] ? (
                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                  <input readOnly value={links[a.id]} onFocus={(e) => e.currentTarget.select()} aria-label={`${a.name} 님 재설정 링크`} className={`${ui.input} h-10 min-w-0 flex-1 text-[13px] md:w-80`} />
                  <button type="button" onClick={() => copy(a.id)} className={`${ui.primary} h-10 px-4 text-[14px]`}>
                    {copied === a.id ? "복사됨" : "링크 복사"}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => makeLink(a)} disabled={a.id === me.id} className={`${ui.secondary} h-10 px-4 text-[14px] disabled:opacity-40`} title={a.id === me.id ? "내 비밀번호는 오른쪽 비밀번호 변경에서 바꿉니다" : undefined}>
                  비밀번호 재설정 링크 만들기
                </button>
              )}
            </li>
          ))}
          {shown.length === 0 && <li className="py-8 text-center text-[15px] text-ink-600">찾는 계정이 없습니다.</li>}
        </ul>
      )}
    </section>
  );
}
