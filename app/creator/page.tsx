import { PageBand } from "@/components/PageBand";
import { CreatorHome } from "@/components/CreatorHome";

export const metadata = { title: "내 일정 │ Campaign Hub │ 스텔라이즈" };

export default function CreatorPage() {
  return (
    <>
      <PageBand title="내 일정">참여 중인 캠페인의 일정과 마감입니다. 기획안·가편안·수정본은 링크로 제출합니다.</PageBand>
      <CreatorHome />
    </>
  );
}
