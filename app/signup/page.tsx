import { PageBand, pageWrap } from "@/components/PageBand";
import { StaffSignupForm } from "@/components/AuthForms";

export const metadata = { title: "회원가입 │ Campaign Hub │ 스텔라이즈" };

export default function SignupPage() {
  return (
    <>
      <PageBand title="회원가입" center>스텔라이즈팀 운영 담당자용입니다. 크리에이터는 담당자가 보낸 초대 링크로 가입합니다.</PageBand>
      <main className={`${pageWrap} py-12 md:py-16`}>
        <StaffSignupForm />
      </main>
    </>
  );
}
