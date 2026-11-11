import { PageBand, pageWrap } from "@/components/PageBand";
import { MyCampaigns } from "@/components/MyCampaigns";
import { AccountInfo, PasswordForm } from "@/components/Account";

export const metadata = { title: "마이페이지 │ Campaign Hub │ 스텔라이즈" };

const h2 = "text-[22px] font-bold tracking-[-0.03em] text-ink-900";

export default function MyPage() {
  return (
    <>
      <PageBand title="마이페이지">내 계정과 내가 맡은 캠페인을 봅니다.</PageBand>
      <main className={`${pageWrap} grid gap-14 py-10 md:grid-cols-2 md:gap-20 md:py-14`}>
        <section>
          <h2 className={h2}>내 정보</h2>
          <AccountInfo />

          <h2 className={`${h2} mt-14`}>내 담당 캠페인</h2>
          <MyCampaigns />
        </section>

        <section>
          <h2 className={h2}>비밀번호 변경</h2>
          <PasswordForm />
        </section>
      </main>
    </>
  );
}
