import Link from "next/link";
import { PageBand, pageWrap } from "@/components/PageBand";

// Old links (크리에이터 DB, 메일 템플릿) and typos land here instead of a bare 404.
export default function NotFound() {
  return (
    <>
      <PageBand title="찾을 수 없는 화면입니다" />
      <main className={`${pageWrap} py-12`}>
        <p className="text-[17px] leading-relaxed text-ink-800">주소가 바뀌었거나 없어진 화면입니다. 위 메뉴에서 캠페인, 오늘 할 일, 계약서로 이동할 수 있습니다.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/campaigns" className="inline-flex h-12 items-center bg-primary-600 px-6 text-[16px] font-bold text-white hover:bg-primary-700">
            캠페인으로 가기
          </Link>
          <Link href="/about" className="inline-flex h-12 items-center border border-line px-6 text-[16px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600">
            소개 보기
          </Link>
        </div>
      </main>
    </>
  );
}
