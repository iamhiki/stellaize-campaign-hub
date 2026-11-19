import { PageBand } from "@/components/PageBand";
import { ChatInbox } from "@/components/ChatInbox";

export const metadata = { title: "대화 │ Campaign Hub │ 스텔라이즈" };

export default function ChatPage() {
  return (
    <>
      <PageBand title="대화">크리에이터와 담당자가 캠페인마다 나눈 대화입니다. 새 메시지는 바로 뜹니다.</PageBand>
      <ChatInbox />
    </>
  );
}
