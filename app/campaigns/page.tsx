import Link from "next/link";
import { PageBand, pageWrap } from "@/components/PageBand";
import { CampaignList } from "@/components/CampaignList";

export const metadata = { title: "캠페인 │ Campaign Hub │ 스텔라이즈" };

export default function CampaignsPage() {
  return (
    <>
      <PageBand title="캠페인">
        캠페인을 누르면 크리에이터별 진행 현황이 열립니다. 여러 캠페인에서 오늘 처리할 건만 보려면{" "}
        <Link href="/today" className="underline underline-offset-4">
          오늘 할 일
        </Link>
        로 가세요.
      </PageBand>
      <main className={`${pageWrap} py-10 md:py-14`}>
        <CampaignList />
      </main>
    </>
  );
}
