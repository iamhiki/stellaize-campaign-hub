import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

// Menus that aren't built yet land here instead of a bare 404.
export default function NotFound() {
  return (
    <>
      <section className="relative bg-[linear-gradient(103deg,#125cad_0%,#1876d6_100%)] text-white">
        <SiteHeader userName="김하늘 님" />
        <div className="mx-auto max-w-[1260px] px-5 pb-10 pt-[120px] md:px-[30px] md:pt-[96px]">
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.04em] md:text-[40px]">아직 만들지 않은 화면입니다</h1>
        </div>
      </section>
      <main className="mx-auto max-w-[1260px] px-5 py-12 md:px-[30px]">
        <p className="text-[17px] leading-relaxed text-ink-800">
          지금은 캠페인 보드와 소개 페이지만 있습니다. 다른 메뉴는 순서대로 만들 예정입니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/campaigns/demo" className="inline-flex h-12 items-center bg-primary-600 px-6 text-[16px] font-bold text-white hover:bg-primary-700">
            캠페인 보드로 가기
          </Link>
          <Link href="/about" className="inline-flex h-12 items-center border border-line px-6 text-[16px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600">
            소개 보기
          </Link>
        </div>
      </main>
    </>
  );
}
