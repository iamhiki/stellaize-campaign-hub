"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, useMe } from "@/lib/me";
import { ChatBell } from "./ChatBell";

// 기획자 피드백 11/7: 캠페인 · 오늘 할 일 · 계약서만. 크리에이터 DB(시트가 흩어져 있음)와 메일 템플릿(사내 AI로 작성)은 뺐다.
const STAFF_MENU = [
  { href: "/campaigns", label: "캠페인" },
  { href: "/today", label: "오늘 할 일" },
  { href: "/contracts", label: "계약서" },
  { href: "/chat", label: "대화" }, // 기획자 11/19: 크리에이터와 채팅
];
// 기획자 11/11: 크리에이터는 우리가 관리하는 페이지는 못 보고 자기 할 일만.
const CREATOR_MENU = [
  { href: "/creator", label: "내 일정" },
  { href: "/chat", label: "대화" },
];
// 개발자 계정: 담당자 화면 전부 + 크리에이터 화면 미리보기.
const DEV_MENU = [...STAFF_MENU, { href: "/creator", label: "크리에이터 화면" }];
const PUBLIC = ["/about", "/login", "/signup", "/join"];

const util = "underline-offset-4 hover:underline aria-[current=page]:underline";

// Incross #header: transparent over the hero, logo | centered GNB | utility, 2px underline on the active menu.
// Below 1024px (phone, tablet): logo and icons on one row, the menu a swipeable row under it. From 1024px, one row.
export function SiteHeader() {
  const path = usePathname();
  const me = useMe();
  const active = (href: string) => path.startsWith(href);
  // Until the account loads, the address says which menu it will be: staff and creator screens only open for
  // their own role (proxy.ts), so the menu doesn't flash in late. Public pages wait for the answer.
  const role = me ? me.role : me === undefined && !PUBLIC.includes(path) ? (path.startsWith("/creator") ? "creator" : "staff") : null;
  const menu = role === "staff" ? STAFF_MENU : role === "dev" ? DEV_MENU : role === "creator" ? CREATOR_MENU : [];
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between px-5 text-white md:px-[30px] lg:h-[72px] lg:flex-nowrap">
        {/* Official Stellaize symbol (stellaize.com favicon). The site's wordmark is a small gray PNG that
            disappears on blue, so the word is set in white with the logo's sky-blue "ai". */}
        <Link href={role === "creator" ? "/creator" : "/"} aria-label={role === "creator" ? "stellaize 내 일정으로 이동" : "stellaize 소개로 이동"} className="flex h-14 shrink-0 items-center gap-2.5 text-[24px] font-semibold tracking-[-0.03em] lg:h-auto lg:text-[26px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static 32px SVG, no optimization needed */}
          <img src="/logo-symbol.svg" alt="" width={32} height={32} className="size-8 rounded-[7px]" />
          <span>
            stell<span className="text-primary-200">ai</span>ze
          </span>
        </Link>
        {menu.length > 0 && (
          <nav className="order-last -mx-5 flex h-12 w-[calc(100%+2.5rem)] gap-7 overflow-x-auto px-5 [scrollbar-width:none] md:-mx-[30px] md:w-[calc(100%+60px)] md:px-[30px] lg:order-none lg:mx-0 lg:h-full lg:w-auto lg:gap-9 lg:overflow-visible lg:px-0 xl:gap-14">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                aria-current={active(m.href) ? "page" : undefined}
                className={`relative flex h-full shrink-0 items-center text-[16px] font-medium after:absolute after:bottom-2 lg:text-[17px] lg:after:bottom-4 after:left-0 after:h-0.5 after:bg-white after:transition-[width] after:duration-300 motion-reduce:after:transition-none after:content-[''] ${
                  active(m.href) ? "after:w-full" : "after:w-0 hover:after:w-full"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex min-h-14 min-w-0 items-center gap-4 text-[15px] font-medium lg:min-h-0 lg:gap-5">
          {me && <ChatBell />}
          {/* Phone: no room next to the logo, and the logo already goes to 소개. */}
          {role !== "creator" && (
            <Link href="/about" aria-current={path === "/about" ? "page" : undefined} className={`${util} ${me ? "hidden lg:inline" : ""}`}>
              소개
            </Link>
          )}
          {me && me.role !== "creator" && (
            <Link href="/mypage" aria-current={path === "/mypage" ? "page" : undefined} aria-label={`마이페이지 (${me.name} 님)`} className={`${util} flex items-center`}>
              {/* Phone and tablet: a person icon, so the row never wraps under the logo. */}
              <svg aria-hidden viewBox="0 0 24 24" className="size-[22px] lg:hidden" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="12" cy="8.5" r="3.75" />
                <path d="M4.75 19.5c1.2-3.3 4-5 7.25-5s6.05 1.7 7.25 5" />
              </svg>
              <span className="hidden max-w-[11em] truncate lg:inline-block lg:align-bottom">{me.name} 님</span>
            </Link>
          )}
          {me?.role === "creator" && <span className="hidden max-w-[11em] truncate lg:inline-block">{me.name} 님</span>}
          {me && (
            <button type="button" onClick={logout} className={`${util} shrink-0`}>
              로그아웃
            </button>
          )}
          {me === null && (
            <Link href="/login" aria-current={path === "/login" || path === "/signup" ? "page" : undefined} className={util}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
