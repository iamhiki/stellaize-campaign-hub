import { PageBand, pageWrap, ui } from "@/components/PageBand";

export const metadata = { title: "계약서 │ Campaign Hub │ 스텔라이즈" };

// 팀장님이 만든 계약서 작성 자동화 웹앱으로 보내는 탭. 첫 단계는 링크 연결이다.
// Set NEXT_PUBLIC_CONTRACT_APP_URL (.env.local or Vercel) to the app's address to turn the button on.
const CONTRACT_APP_URL = process.env.NEXT_PUBLIC_CONTRACT_APP_URL;

export default function ContractsPage() {
  return (
    <>
      <PageBand title="계약서">크리에이터 계약서는 계약서 작성 앱에서 만듭니다.</PageBand>
      <main className={`${pageWrap} py-12 md:py-16`}>
        <div className="max-w-[720px] border-t-2 border-ink-900 pt-8">
          {CONTRACT_APP_URL ? (
            <>
              <p className="text-[17px] leading-relaxed text-ink-800">
                버튼을 누르면 계약서 작성 앱이 새 탭에서 열립니다. 캠페인 허브 화면은 그대로 남아 있습니다.
              </p>
              <a href={CONTRACT_APP_URL} target="_blank" rel="noopener noreferrer" className={`${ui.primary} mt-8`}>
                계약서 작성 앱 열기
              </a>
            </>
          ) : (
            <>
              <p className="text-[17px] leading-relaxed text-ink-800">계약서 작성 앱을 연결하는 중입니다. 앱 주소가 정해지면 이 화면에서 바로 열 수 있습니다.</p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
                연결 다음 단계로, 캠페인과 크리에이터 정보를 계약서에 자동으로 채우는 방법을 검토합니다.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
