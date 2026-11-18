import { ContractPicker } from "@/components/ContractPicker";
import { PageBand, pageWrap } from "@/components/PageBand";

export const metadata = { title: "계약서 │ Campaign Hub │ 스텔라이즈" };

// 계약서 자동작성 앱(기획자 제작)으로 넘기는 탭. 크리에이터를 누르면 캠페인 정보가 채워진 계약서 앱이 새 탭으로 열린다.

const SAMPLES = ["사업자등록증", "주민등록증", "통장사본"];

export default function ContractsPage() {
  return (
    <>
      <PageBand title="계약서">크리에이터 이름을 누르면 캠페인 정보가 채워진 계약서 앱이 열립니다.</PageBand>
      <main className={`${pageWrap} py-10 md:py-14`}>
        <h2 className="mb-5 text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:text-[32px]">크리에이터 선택</h2>
        <ContractPicker />

        {/* Fake documents for trying the hosted demo of the contract app. Same files as its sidebar (stellaize-contract-demo/samples). */}
        <section aria-labelledby="samples" className="mt-14">
          <h2 id="samples" className="text-[20px] font-bold tracking-[-0.03em] text-ink-900">견본 서류 (가짜)</h2>
          <p className="mt-2 text-[15px] text-ink-600">계약서 앱을 체험할 때 올리는 가짜 서류입니다. 실제 서류는 올리지 마세요.</p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {SAMPLES.map((n) => (
              <li key={n}>
                <a href={encodeURI(`/samples/견본_${n}.png`)} download className="inline-flex h-11 items-center border border-line bg-white px-4 text-[14px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600">
                  {n} 받기
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
