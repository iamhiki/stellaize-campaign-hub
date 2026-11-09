import Link from "next/link";
import { PageBand } from "@/components/PageBand";
import { TodayList } from "@/components/TodayList";

export const metadata = { title: "오늘 할 일 │ Campaign Hub │ 스텔라이즈" };

export default function TodayPage() {
  return (
    <>
      <PageBand title="오늘 할 일">
        여러 캠페인에서 오늘 처리할 건만 모았습니다. 캠페인 하나를 자세히 보려면{" "}
        <Link href="/campaigns" className="underline underline-offset-4">
          캠페인
        </Link>
        으로 가세요.
      </PageBand>
      <TodayList />
    </>
  );
}
