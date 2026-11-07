import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { WAITING } from "@/components/badges";
import { STAGES } from "@/lib/date";
import { CURRENT_USER, type WaitingOn } from "@/lib/demo";
import board from "@/public/board-preview.webp";

export const metadata: Metadata = { title: "소개 │ Campaign Hub │ 스텔라이즈" };

// Copy states only confirmed facts (README, PRODUCT.md, incross.com). No invented metrics.
const FLOW = ["접수", ...STAGES];

const BEFORE = [
  { title: "한 캠페인에 크리에이터 5~10명 이상", body: "같은 캠페인 안에서도 사람마다 진행 단계가 제각각입니다." },
  { title: "시트, 슬랙, 메일에 흩어진 정보", body: "캠페인 하나의 진행 상황을 보려면 세 곳을 오가야 했습니다." },
  { title: "진행 상황은 메일로 확인", body: "어디까지 진행됐는지 매번 메일을 보내 물어봐야 했습니다." },
];

const AFTER = [
  { title: "누구를 기다리는지 보입니다", body: "크리에이터마다 광고주, 크리에이터, 우리 중 누구 차례인지와 며칠째인지 표시합니다." },
  { title: "늦어진 건이 먼저 보입니다", body: "3일 넘게 기다린 건은 빨간색으로 표시하고, 캠페인 요약에 건수를 모읍니다." },
  { title: "날짜는 자동으로 계산합니다", body: "리스트 마감, 업로드, 업로드 후 14일 리포트 마감까지 한국 시간 기준으로 셉니다." },
  { title: "단계별 체크리스트", body: "단가 회신부터 피저체크, 날인본, 최종본 컨펌까지 카드 안에서 체크합니다." },
];

const NEXT = ["실제 데이터 연결 (Supabase)", "로그인 (아이디·비밀번호)", "대외비 캠페인 접근 제한", "메일 템플릿"];

// Sample cards in the opening band: the waiting party rotates, which is the product's whole idea in one motion.
const HERO_CARDS: { name: string; stage: string; states: [WaitingOn, number][]; indent: string }[] = [
  { name: "데일리민지", stage: "리스트업", states: [["creator", 1], ["us", 0], ["advertiser", 2]], indent: "" },
  { name: "지수의 화장대", stage: "제작", states: [["advertiser", 5], ["us", 0], ["creator", 1]], indent: "ml-14" },
  { name: "소담뷰티", stage: "업로드", states: [["us", 0], ["creator", 2], ["advertiser", 1]], indent: "ml-6" },
];

const wrap = "mx-auto max-w-[1260px] px-5 md:px-[30px]";
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;
const h2 = "text-[30px] font-bold leading-tight tracking-[-0.04em] text-ink-900 md:text-[44px]";

export default function AboutPage() {
  return (
    <>
      <RevealOnScroll />
      {/* Incross-style opening band, Stellaize blues; white text stays >= 4.5:1 on both stops */}
      <section className="relative flex min-h-[min(88svh,820px)] flex-col overflow-hidden bg-[linear-gradient(103deg,#125cad_0%,#1876d6_100%)] text-white">
        <SiteHeader userName={`${CURRENT_USER.name} 님`} />
        <div className={`${wrap} grid w-full flex-1 items-center gap-12 pb-20 pt-[140px] md:grid-cols-[1.25fr_1fr] md:pt-[120px]`}>
          <div>
            <h1 className="text-[40px] font-bold leading-[1.15] tracking-[-0.04em] md:text-[72px]">
              <span className="rise-in block">누가 어디서</span>
              <span className="rise-in block" style={delay(120)}>
                누구를 기다리는지
              </span>
              <span className="rise-in block" style={delay(240)}>
                한 화면에서
              </span>
            </h1>
            <p className="rise-in mt-8 max-w-[520px] text-[17px] font-medium leading-relaxed md:text-[20px]" style={delay(420)}>
              광고 한 건에 크리에이터 여러 명, 그런 광고 여러 개를 동시에. 캠페인 허브는 스텔라이즈 부서가 인플루언서 광고의 진행 상황을 한곳에서 관리하는 사내 웹 도구입니다.
            </p>
            <Link
              href="/today"
              className="rise-in mt-10 inline-flex h-14 w-fit items-center bg-white px-8 text-[17px] font-bold text-primary-700 transition-colors hover:bg-primary-100"
              style={delay(540)}
            >
              시작하기
            </Link>
          </div>

          <ul aria-label="예시: 크리에이터별 대기 상태" className="hidden flex-col gap-4 md:flex">
            {HERO_CARDS.map((c, i) => (
              <li key={c.name} className={`rise-in ${c.indent}`} style={delay(600 + i * 150)}>
                <div className="drift w-[300px] bg-white px-6 py-5 text-ink-900" style={delay(i * 900)}>
                  <p className="flex items-baseline justify-between">
                    <span className="text-[17px] font-bold">{c.name}</span>
                    <span className="text-[13px] text-ink-600">{c.stage}</span>
                  </p>
                  <p className="cycle relative mt-3 h-6 text-[15px] font-medium text-ink-800">
                    {c.states.map(([on, days]) => (
                      <span key={on} className="absolute inset-0 flex items-center gap-2">
                        <span aria-hidden className={`size-2 shrink-0 ${WAITING[on].square}`} />
                        {WAITING[on].label}
                        {days > 0 && <b className={days >= 3 ? "text-danger-700" : "font-medium text-ink-600"}>{days}일째</b>}
                      </span>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main>
        <section className={`${wrap} py-20 md:py-32`}>
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-20">
            <h2 data-reveal className={h2}>
              스텔라이즈 부서
            </h2>
            <p data-reveal style={delay(120)} className="text-[17px] leading-[1.8] text-ink-800 md:text-[19px]">
              스텔라이즈는 인플루언서 광고를 운영하는 부서입니다. 광고주가 광고를 의뢰하면 어울리는 크리에이터를 찾아 제안하고,
              섭외와 계약, 콘텐츠 제작과 업로드를 거쳐 성과 리포트가 나올 때까지 모든 과정을 챙깁니다.
            </p>
          </div>
          <div className="mt-16">
            <div data-reveal="line" className="h-0.5 bg-ink-900" />
            <ol className="grid grid-cols-2 gap-y-6 pt-6 sm:grid-cols-4 md:grid-cols-7">
              {FLOW.map((step, i) => (
                <li key={step} data-reveal style={delay(200 + i * 110)} className="text-[16px] font-bold text-ink-900 md:text-[18px]">
                  <span className="mb-2 block text-[14px] font-semibold tabular-nums text-ink-600">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#f5f7fa] py-20 md:py-32">
          <div className={wrap}>
            <h2 data-reveal className={h2}>
              지금까지는
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
              {BEFORE.map((b, i) => (
                <article key={b.title} data-reveal style={delay(i * 140)} className="md:px-8 md:first:pl-0">
                  <h3 className="text-[19px] font-bold leading-snug text-ink-900 md:text-[21px]">{b.title}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-600">{b.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${wrap} py-20 md:py-32`}>
          <h2 data-reveal className={h2}>
            캠페인 허브에서는
          </h2>
          <div className="mt-12">
            <div data-reveal="line" className="h-0.5 bg-ink-900" />
            <div className="grid gap-x-16 md:grid-cols-2">
              {AFTER.map((a, i) => (
                <article key={a.title} data-reveal style={delay(i * 120)} className="border-b border-line py-7">
                  <h3 className="text-[19px] font-bold text-ink-900 md:text-[21px]">{a.title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-ink-600">{a.body}</p>
                </article>
              ))}
            </div>
          </div>
          <figure data-reveal="zoom" className="mt-20 md:mt-28">
            <Image
              src={board}
              alt="캠페인 칸반 화면. 크리에이터별 대기 주체와 대기 일수, 단계별 열이 보인다."
              sizes="(min-width: 1260px) 1200px, 100vw"
              className="h-auto w-full border border-line"
              placeholder="blur"
            />
            <figcaption className="mt-4 text-[14px] text-ink-600">캠페인 칸반 화면 (예시 데이터)</figcaption>
          </figure>
        </section>

        <section className="border-t border-line">
          <div className={`${wrap} grid gap-10 py-20 md:grid-cols-[1fr_1.4fr] md:gap-20 md:py-28`}>
            <div data-reveal>
              <h2 className={h2}>지금 단계</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-800">
                오늘 할 일, 캠페인 목록과 진행 보드, 크리에이터 DB, 마이페이지가 예시 데이터로 동작합니다. 실제 캠페인 데이터와 로그인은 아직 연결 전입니다.
              </p>
            </div>
            <div>
              <h3 data-reveal className="text-[16px] font-bold text-ink-900">
                다음에 만들 것
              </h3>
              <div data-reveal="line" className="mt-4 h-0.5 bg-ink-900" />
              <ul>
                {NEXT.map((n, i) => (
                  <li key={n} data-reveal style={delay(i * 90)} className="flex items-center gap-2.5 border-b border-line py-4 text-[17px] text-ink-800">
                    <span aria-hidden className="size-2 shrink-0 bg-primary-500" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
