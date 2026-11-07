import Link from "next/link";
import { PageBand, pageWrap } from "@/components/PageBand";

// Menus that aren't built yet land here instead of a bare 404.
export default function NotFound() {
  return (
    <>
      <PageBand title="아직 만들지 않은 화면입니다" />
      <main className={`${pageWrap} py-12`}>
        <p className="text-[17px] leading-relaxed text-ink-800">메일 템플릿은 순서대로 만들 예정입니다.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/today" className="inline-flex h-12 items-center bg-primary-600 px-6 text-[16px] font-bold text-white hover:bg-primary-700">
            오늘 할 일로 가기
          </Link>
          <Link href="/about" className="inline-flex h-12 items-center border border-line px-6 text-[16px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600">
            소개 보기
          </Link>
        </div>
      </main>
    </>
  );
}
