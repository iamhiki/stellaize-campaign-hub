import { ContractPicker } from "@/components/ContractPicker";
import { PageBand, pageWrap } from "@/components/PageBand";

export const metadata = { title: "계약서 │ Campaign Hub │ 스텔라이즈" };

// 계약서 자동작성 앱(팀장 제작)으로 넘기는 탭. 앱은 정산서류 개인정보 때문에 각자 PC에서만 열리므로
// 이 허브는 앱을 품지 않고, 캠페인 정보를 담은 링크로 연다.
const STEPS = [
  { title: "계약서 앱 켜기", body: "공유 드라이브의 계약서 자동작성 시스템 폴더를 내 PC로 복사하고 실행.bat 을 더블클릭합니다. 검은 창은 닫지 않습니다." },
  { title: "크리에이터 고르기", body: "아래 표에서 크리에이터 이름을 누르면 계약서 앱이 새 탭으로 열립니다." },
  { title: "서류 올리고 내려받기", body: "캠페인명, 광고주명, 업로드 날짜, 크리에이터명이 미리 채워져 있습니다. 정산서류를 올리고 나머지를 확인해 내려받습니다." },
];

export default function ContractsPage() {
  return (
    <>
      <PageBand title="계약서">크리에이터 계약서는 계약서 자동작성 앱에서 만듭니다. 캠페인 정보는 이 화면에서 골라 넘깁니다.</PageBand>
      <main className={`${pageWrap} py-10 md:py-14`}>
        <ol className="grid gap-y-6 border-t-2 border-ink-900 pt-6 md:grid-cols-3 md:gap-x-10">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="block text-[14px] font-semibold tabular-nums text-ink-600">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-1 text-[18px] font-bold text-ink-900">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 border-l-2 border-line-strong pl-4 text-[14px] leading-relaxed text-ink-800">
          신분증, 통장 사본 같은 서류와 개인정보는 계약서 앱이 내 PC 안에서만 처리합니다. 캠페인 허브로는 아무것도 넘어오지 않습니다.
          앱이 켜져 있지 않으면 링크를 눌렀을 때 &ldquo;사이트에 연결할 수 없음&rdquo;이 뜹니다.
        </p>

        <h2 className="mb-5 mt-14 text-[26px] font-bold tracking-[-0.04em] text-ink-900 md:text-[32px]">크리에이터 선택</h2>
        <ContractPicker />
      </main>
    </>
  );
}
