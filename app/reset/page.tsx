import { Suspense } from "react";
import { Loading, PageBand, pageWrap } from "@/components/PageBand";
import { ResetForm } from "@/components/AuthForms";

export const metadata = { title: "새 비밀번호 │ Campaign Hub │ 스텔라이즈" };

export default function ResetPage() {
  return (
    <>
      <PageBand title="새 비밀번호 정하기" center>
        받은 재설정 링크로 새 비밀번호를 정합니다.
      </PageBand>
      <main className={`${pageWrap} py-12 md:py-16`}>
        {/* The one-time code is in the address, which only the browser knows. */}
        <Suspense fallback={<Loading />}>
          <ResetForm />
        </Suspense>
      </main>
    </>
  );
}
