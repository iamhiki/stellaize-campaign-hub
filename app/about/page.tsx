import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { STAGES } from "@/lib/date";
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

const NEXT = ["실제 데이터 연결 (Supabase)", "오늘 할 일 대시보드", "크리에이터 DB", "대외비 캠페인 접근 제한", "메일 템플릿"];

const wrap = "mx-auto max-w-[1260px] px-5 md:px-[30px]";

export default function AboutPage() {
  return (
    <>
      {/* Incross-style opening band, Stellaize blues; white text stays >= 4.5:1 on both stops */}
      <section className="relative flex min-h-[min(88svh,820px)] flex-col bg-[linear-gradient(103deg,#125cad_0%,#1876d6_100%)] text-white">
        <SiteHeader userName="김하늘 님" />
        <div className={`${wrap} flex w-full flex-1 flex-col justify-center pb-20 pt-[140px] md:pt-[120px]`}>
          <h1 className="text-[40px] font-bold leading-[1.15] tracking-[-0.04em] md:text-[76px]">
            <span className="rise-in block">누가, 어디서,</span>
            <span className="rise-in block" style={{ "--delay": "120ms" } as React.CSSProperties}>
              누구를 기다리는지.
            </span>
            <span className="rise-in block" style={{ "--delay": "240ms" } as React.CSSProperties}>
              한 화면에서.
            </span>
          </h1>
          <p className="rise-in mt-8 max-w-[560px] text-[17px] font-medium leading-relaxed md:text-[20px]" style={{ "--delay": "420ms" } as React.CSSProperties}>
            스텔라이즈 캠페인 허브는 스텔라이즈팀이 인플루언서 캠페인을 운영하는 사내 도구입니다.
          </p>
          <Link
            href="/campaigns/demo"
            className="rise-in mt-10 inline-flex h-14 w-fit items-center bg-white px-8 text-[17px] font-bold text-primary-700 transition-colors hover:bg-primary-100"
            style={{ "--delay": "540ms" } as React.CSSProperties}
          >
            캠페인 보드 보기
          </Link>
        </div>
      </section>

      <main>
        <section className={`${wrap} py-20 md:py-32`}>
          <div className="rise-on-view grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-20">
            <h2 className="text-[30px] font-bold leading-tight tracking-[-0.04em] text-ink-900 md:text-[44px]">스텔라이즈팀</h2>
            <p className="text-[17px] leading-[1.8] text-ink-800 md:text-[19px]">
              스텔라이즈는 인크로스의 AI PPL 플랫폼입니다. 스텔라이즈팀은 광고주의 의뢰를 받아 캠페인에 맞는 크리에이터를 찾고, 섭외하고,
              콘텐츠가 올라가 리포트가 나올 때까지 캠페인 전 과정을 운영합니다.
            </p>
          </div>
          <ol className="rise-on-view mt-16 grid grid-cols-2 gap-y-6 border-t-2 border-ink-900 pt-6 sm:grid-cols-4 md:grid-cols-7">
            {FLOW.map((step, i) => (
              <li key={step} className="text-[16px] font-bold text-ink-900 md:text-[18px]">
                <span className="mb-2 block text-[14px] font-semibold tabular-nums text-ink-600">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-[#f5f7fa] py-20 md:py-32">
          <div className={wrap}>
            <h2 className="rise-on-view text-[30px] font-bold leading-tight tracking-[-0.04em] text-ink-900 md:text-[44px]">지금까지는</h2>
            <div className="rise-on-view mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
              {BEFORE.map((b) => (
                <article key={b.title} className="md:px-8 md:first:pl-0">
                  <h3 className="text-[19px] font-bold leading-snug text-ink-900 md:text-[21px]">{b.title}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-600">{b.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${wrap} py-20 md:py-32`}>
          <h2 className="rise-on-view text-[30px] font-bold leading-tight tracking-[-0.04em] text-ink-900 md:text-[44px]">
            캠페인 허브에서는
          </h2>
          <div className="rise-on-view mt-12 grid gap-x-16 border-t-2 border-ink-900 md:grid-cols-2">
            {AFTER.map((a) => (
              <article key={a.title} className="border-b border-line py-7">
                <h3 className="text-[19px] font-bold text-ink-900 md:text-[21px]">{a.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-600">{a.body}</p>
              </article>
            ))}
          </div>
          <figure className="rise-on-view mt-20 md:mt-28">
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
            <div className="rise-on-view">
              <h2 className="text-[30px] font-bold leading-tight tracking-[-0.04em] text-ink-900 md:text-[44px]">지금 단계</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-800">
                캠페인 칸반 화면 하나가 예시 데이터로 동작합니다. 실제 캠페인 데이터는 아직 연결 전입니다.
              </p>
            </div>
            <div className="rise-on-view">
              <h3 className="text-[16px] font-bold text-ink-900">다음에 만들 것</h3>
              <ul className="mt-4 border-t-2 border-ink-900">
                {NEXT.map((n) => (
                  <li key={n} className="flex items-center gap-2.5 border-b border-line py-4 text-[17px] text-ink-800">
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
