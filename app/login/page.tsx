import { PageBand, pageWrap } from "@/components/PageBand";
import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "로그인 │ Campaign Hub │ 스텔라이즈" };

export default function LoginPage() {
  return (
    <>
      <PageBand title="로그인" center>스텔라이즈팀 담당자와 초대받은 크리에이터가 로그인합니다.</PageBand>
      <main className={`${pageWrap} py-12 md:py-16`}>
        <LoginForm />
      </main>
    </>
  );
}
