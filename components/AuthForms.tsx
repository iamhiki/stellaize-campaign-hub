"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { post, useMe } from "@/lib/me";
import { Loading, ui } from "./PageBand";

const box = "mx-auto flex w-full max-w-[560px] flex-col gap-6 border-t-2 border-ink-900 pt-8";
const note = "text-[15px] leading-relaxed text-ink-600";
const text = "text-[15px] font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700";

// A full page load after signing in, so every screen starts from the new account.
const go = (path: string) => window.location.assign(path);

function Problem({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[15px] font-semibold text-danger-700">
      {children}
    </p>
  );
}

function Field({ label, hint, ...input }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={ui.label}>
      {label}
      <input required className={`${ui.input} h-14 text-[17px]`} {...input} />
      {hint && <span className="text-[13px] font-normal text-ink-600">{hint}</span>}
    </label>
  );
}

/** Runs one request at a time and keeps its error message for the form. */
function useSubmit() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(url: string, data: unknown, then: () => void) {
    setBusy(true);
    const problem = await post(url, data);
    setBusy(false);
    setError(problem);
    if (!problem) then();
  }
  return { error, busy, run };
}

const values = (form: FormData) => Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));

export function LoginForm() {
  const { error, busy, run } = useSubmit();
  return (
    <form
      className={box}
      onSubmit={(ev) => {
        ev.preventDefault();
        // The proxy sends each role to its own first screen from here.
        run("/api/auth/login", values(new FormData(ev.currentTarget)), () => go("/login"));
      }}
    >
      <Field label="이메일" name="email" type="email" autoComplete="username" />
      <Field label="비밀번호" name="password" type="password" autoComplete="current-password" />
      <Problem>{error}</Problem>
      <button type="submit" disabled={busy} className={`${ui.primary} h-14 text-[17px]`}>
        {busy ? "확인하는 중" : "로그인"}
      </button>
      <Link href="/signup" className={`${ui.secondary} h-14 text-[17px]`}>
        회원가입
      </Link>
      <p className={note}>회원가입은 스텔라이즈팀 담당자와 개발자용이고 가입 코드가 필요합니다. 크리에이터는 담당자가 보낸 초대 링크로 가입합니다.</p>
    </form>
  );
}

export function StaffSignupForm() {
  const { error, busy, run } = useSubmit();
  return (
    <form
      className={box}
      onSubmit={(ev) => {
        ev.preventDefault();
        run("/api/auth/signup", values(new FormData(ev.currentTarget)), () => go("/campaigns"));
      }}
    >
      <Field label="이름" name="name" autoComplete="name" maxLength={30} hint="캠페인 담당자 칸에 적는 이름과 같게 넣으면 내 담당 캠페인이 모입니다." />
      <Field label="이메일" name="email" type="email" autoComplete="username" />
      <Field label="비밀번호" name="password" type="password" autoComplete="new-password" minLength={8} hint="8자 이상" />
      <Field label="가입 코드" name="code" autoComplete="off" hint="담당자는 팀 가입 코드, 개발자는 개발자 코드를 넣습니다." />
      <Problem>{error}</Problem>
      <button type="submit" disabled={busy} className={`${ui.primary} h-14 text-[17px]`}>
        {busy ? "가입하는 중" : "가입하기"}
      </button>
      <p className={note}>
        이미 가입했다면{" "}
        <Link href="/login" className={text}>
          로그인
        </Link>
        하세요.
      </p>
    </form>
  );
}

type Invite = { campaign: string; creator: string };

/** The page behind a creator's invite link (/join?t=…): sign up, or sign in to add the campaign to an account. */
export function JoinPanel() {
  const invite = useSearchParams().get("t") ?? "";
  const me = useMe();
  // undefined = asking, null = the link doesn't work
  const [info, setInfo] = useState<Invite | null | undefined>(undefined);
  const [hasAccount, setHasAccount] = useState(false);
  const { error, busy, run } = useSubmit();

  useEffect(() => {
    let live = true;
    fetch(`/api/join?t=${encodeURIComponent(invite)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: Invite | null) => live && setInfo(d));
    return () => {
      live = false;
    };
  }, [invite]);

  if (info === undefined || me === undefined) return <Loading />;
  if (info === null)
    return (
      <div className={box}>
        <p className="text-[17px] text-ink-800">초대 링크가 만료됐거나 이미 사용됐습니다. 담당자에게 새 링크를 요청해 주세요.</p>
        <Link href="/login" className={`${ui.secondary} w-fit`}>
          로그인 화면으로
        </Link>
      </div>
    );

  const invited = (
    <p className="text-[17px] leading-relaxed text-ink-800">
      <b className="font-bold text-ink-900">{info.campaign}</b> 캠페인에 <b className="font-bold text-ink-900">{info.creator}</b> 님으로 초대받았습니다.
    </p>
  );
  const done = () => go("/creator");

  if (me && me.role !== "creator")
    return (
      <div className={box}>
        {invited}
        <p className={note}>지금 담당자 계정({me.email})으로 로그인되어 있습니다. 이 링크는 크리에이터가 열어야 합니다. 주소를 복사해 크리에이터에게 보내 주세요.</p>
      </div>
    );

  if (me?.role === "creator")
    return (
      <div className={box}>
        {invited}
        <Problem>{error}</Problem>
        <button type="button" disabled={busy} onClick={() => run("/api/join", { invite }, done)} className={`${ui.primary} w-fit`}>
          내 계정({me.email})에 추가
        </button>
      </div>
    );

  return (
    <form
      className={box}
      onSubmit={(ev) => {
        ev.preventDefault();
        const v = values(new FormData(ev.currentTarget));
        if (hasAccount) run("/api/auth/login", v, () => run("/api/join", { invite }, done));
        else run("/api/auth/signup", { ...v, invite }, done);
      }}
    >
      {invited}
      {!hasAccount && <Field label="이름 (활동명)" name="name" autoComplete="name" maxLength={30} defaultValue={info.creator} />}
      <Field label="이메일" name="email" type="email" autoComplete="username" hint={hasAccount ? undefined : "로그인 아이디로 쓰고, 마감 알림을 받을 주소입니다."} />
      <Field label="비밀번호" name="password" type="password" autoComplete={hasAccount ? "current-password" : "new-password"} minLength={hasAccount ? undefined : 8} hint={hasAccount ? undefined : "8자 이상"} />
      <Problem>{error}</Problem>
      <button type="submit" disabled={busy} className={`${ui.primary} h-14 text-[17px]`}>
        {hasAccount ? "로그인하고 캠페인 추가" : "가입하고 내 일정 보기"}
      </button>
      <button type="button" onClick={() => setHasAccount(!hasAccount)} className={`${text} w-fit`}>
        {hasAccount ? "처음이라면 가입하기" : "이미 계정이 있다면 로그인"}
      </button>
    </form>
  );
}
