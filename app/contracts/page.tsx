import { ContractPicker } from "@/components/ContractPicker";
import { SampleDocs } from "@/components/SampleDocs";
import { PageBand, pageWrap } from "@/components/PageBand";

export const metadata = { title: "계약서 │ Campaign Hub │ 스텔라이즈" };

// 계약서 자동작성 앱(기획자 제작)으로 넘기는 탭. 크리에이터를 누르면 캠페인 정보가 채워진 계약서 앱이 새 탭으로 열린다.

export default function ContractsPage() {
  return (
    <>
      <PageBand title="계약서">크리에이터 이름을 누르면 캠페인 정보가 채워진 계약서 앱이 열립니다.</PageBand>
      <main className={`${pageWrap} py-10 md:py-14`}>
        <h2 className="mb-5 text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:text-[32px]">크리에이터 선택</h2>
        <ContractPicker />

        <SampleDocs />
      </main>
    </>
  );
}
