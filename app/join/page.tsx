import { Suspense } from "react";
import { Loading, PageBand, pageWrap } from "@/components/PageBand";
import { JoinPanel } from "@/components/AuthForms";

export const metadata = { title: "크리에이터 초대 │ Campaign Hub │ 스텔라이즈" };

export default function JoinPage() {
  return (
    <>
      <PageBand title="크리에이터 초대" center>가입하면 내 일정과 마감을 확인하고, 기획안·가편안·수정본 링크를 여기서 제출합니다.</PageBand>
      <main className={`${pageWrap} py-12 md:py-16`}>
        {/* The invite code is in the address, which only the browser knows. */}
        <Suspense fallback={<Loading />}>
          <JoinPanel />
        </Suspense>
      </main>
    </>
  );
}
