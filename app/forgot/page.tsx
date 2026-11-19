import { PageBand, pageWrap } from "@/components/PageBand";
import { ForgotForm } from "@/components/AuthForms";

export const metadata = { title: "비밀번호 · 아이디 찾기 │ Campaign Hub │ 스텔라이즈" };

export default function ForgotPage() {
  return (
    <>
      <PageBand title="비밀번호 · 아이디 찾기" center>
        로그인 이메일이나 비밀번호를 잊었을 때 씁니다.
      </PageBand>
      <main className={`${pageWrap} py-12 md:py-16`}>
        <ForgotForm />
      </main>
    </>
  );
}
