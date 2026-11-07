"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/", label: "오늘 할 일" },
  { href: "/campaigns", label: "캠페인" },
  { href: "/creators", label: "크리에이터 DB" },
  { href: "/templates", label: "메일 템플릿" },
  { href: "/glossary", label: "용어 사전" },
];

// Incross #header: transparent over the hero, logo | centered GNB | utility, 2px underline on the active menu.
export function SiteHeader({ userName }: { userName: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-[90px] max-w-[1720px] items-center justify-between px-[30px] text-white">
        {/* shortcut: text wordmark in the logo's style until the official file is in public/ */}
        <Link href="/" className="text-[26px] font-semibold tracking-[-0.03em]">
          stell<span className="text-primary-200">ai</span>ze
        </Link>
        <nav className="flex h-full gap-14">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              aria-current={active(m.href) ? "page" : undefined}
              className={`relative flex h-full items-center text-[17px] font-medium after:absolute after:bottom-6 after:left-0 after:h-0.5 after:bg-white after:transition-all after:duration-300 after:content-[''] ${
                active(m.href) ? "after:w-full" : "after:w-0 hover:after:w-full"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <span className="text-[15px] font-medium">{userName}</span>
      </div>
    </header>
  );
}
