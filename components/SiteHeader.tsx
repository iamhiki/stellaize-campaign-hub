"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 기획자 피드백 11/7: 캠페인 · 오늘 할 일 · 계약서만. 크리에이터 DB(시트가 흩어져 있음)와 메일 템플릿(사내 AI로 작성)은 뺐다.
const MENU = [
  { href: "/campaigns", label: "캠페인" },
  { href: "/today", label: "오늘 할 일" },
  { href: "/contracts", label: "계약서" },
];

// Incross #header: transparent over the hero, logo | centered GNB | utility, 2px underline on the active menu.
// Phone: logo and user on one row, the menu becomes a swipeable row under it.
export function SiteHeader({ userName }: { userName: string }) {
  const path = usePathname();
  const active = (href: string) => path.startsWith(href);
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between px-5 text-white md:h-[72px] md:flex-nowrap md:px-[30px]">
        {/* Official Stellaize symbol (stellaize.com favicon). The site's wordmark is a small gray PNG that
            disappears on blue, so the word is set in white with the logo's sky-blue "ai". */}
        <Link href="/" aria-label="stellaize 소개로 이동" className="flex h-14 items-center gap-2.5 text-[24px] font-semibold tracking-[-0.03em] md:h-auto md:text-[26px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static 32px SVG, no optimization needed */}
          <img src="/logo-symbol.svg" alt="" width={32} height={32} className="size-8 rounded-[7px]" />
          <span>
            stell<span className="text-primary-200">ai</span>ze
          </span>
        </Link>
        <nav className="order-last -mx-5 flex h-12 w-[calc(100%+2.5rem)] gap-7 overflow-x-auto px-5 [scrollbar-width:none] md:order-none md:mx-0 md:h-full md:w-auto md:gap-14 md:overflow-visible md:px-0">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              aria-current={active(m.href) ? "page" : undefined}
              className={`relative flex h-full shrink-0 items-center text-[16px] font-medium after:absolute after:bottom-2 md:text-[17px] md:after:bottom-4 after:left-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 after:content-[''] ${
                active(m.href) ? "after:w-full" : "after:w-0 hover:after:w-full"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-5 text-[15px] font-medium">
          <Link href="/about" aria-current={path === "/about" ? "page" : undefined} className="underline-offset-4 hover:underline aria-[current=page]:underline">
            소개
          </Link>
          <Link href="/mypage" aria-current={path === "/mypage" ? "page" : undefined} className="underline-offset-4 hover:underline aria-[current=page]:underline">
            {userName}
          </Link>
        </div>
      </div>
    </header>
  );
}
