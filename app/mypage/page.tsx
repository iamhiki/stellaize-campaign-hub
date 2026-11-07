import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PageBand, pageWrap } from "@/components/PageBand";
import { ProgressBar } from "@/components/ProgressBar";
import { todayKST } from "@/lib/date";
import { CURRENT_USER, demo } from "@/lib/demo";

export const metadata = { title: "마이페이지 │ Campaign Hub │ 스텔라이즈" };

export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <Mine />
    </Suspense>
  );
}

const h2 = "text-[22px] font-bold tracking-[-0.03em] text-ink-900";
const field = "h-12 w-full border border-line bg-[#f5f7fa] px-4 text-[16px] text-ink-600";

// shortcut: login isn't connected yet. Account fields and password change are laid out but disabled;
// wire them to Supabase Auth when login exists.
async function Mine() {
  await connection();
  const mine = demo(todayKST()).campaigns.filter((c) => c.owners.includes(CURRENT_USER.name));

  return (
    <>
      <PageBand title="마이페이지">내 계정과 내가 맡은 캠페인을 봅니다. 로그인을 연결하면 본인 아이디와 비밀번호로 들어옵니다.</PageBand>
      <main className={`${pageWrap} grid gap-14 py-10 md:grid-cols-2 md:gap-20 md:py-14`}>
        <section>
          <h2 className={h2}>내 정보</h2>
          <dl className="mt-5 border-t-2 border-ink-900 text-[16px]">
            {[
              ["이름", CURRENT_USER.name],
              ["부서", CURRENT_USER.team],
              ["아이디", "로그인 연결 후 표시"],
              ["이메일", "로그인 연결 후 표시"],
            ].map(([k, v]) => (
              <div key={k} className="flex border-b border-line py-4">
                <dt className="w-28 shrink-0 text-ink-600">{k}</dt>
                <dd className={v.startsWith("로그인") ? "text-ink-600" : "font-semibold text-ink-900"}>{v}</dd>
              </div>
            ))}
          </dl>

          <h2 className={`${h2} mt-14`}>내 담당 캠페인</h2>
          <ul className="mt-5 border-t-2 border-ink-900">
            {mine.map((c, i) => (
              <li key={c.id} className="border-b border-line py-4">
                <Link href={`/campaigns/${c.id}`} className="font-semibold underline-offset-4 hover:text-primary-600 hover:underline">
                  {c.brand} {c.product}
                </Link>
                <div className="mt-2">
                  <ProgressBar label={`${c.brand} ${c.product}`} stages={c.creators.map((cc) => cc.stage)} delay={200 + i * 120} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={h2}>비밀번호 변경</h2>
          <form className="mt-5 flex flex-col gap-5 border-t-2 border-ink-900 pt-6" aria-describedby="pw-note">
            {["현재 비밀번호", "새 비밀번호", "새 비밀번호 확인"].map((label) => (
              <label key={label} className="flex flex-col gap-2 text-[15px] font-medium text-ink-800">
                {label}
                <input type="password" autoComplete={label === "현재 비밀번호" ? "current-password" : "new-password"} disabled className={field} />
              </label>
            ))}
            <button type="submit" disabled className="h-12 bg-[#ebeff2] text-[16px] font-bold text-ink-600">
              변경하기
            </button>
            <p id="pw-note" className="text-[14px] text-ink-600">
              로그인을 연결하면 사용할 수 있습니다.
            </p>
          </form>
        </section>
      </main>
    </>
  );
}
