import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { WAITING } from "@/components/badges";
import type { WaitingOn } from "@/lib/campaigns";
import board from "@/public/board-preview.png";

export const metadata: Metadata = { title: "소개 │ Campaign Hub │ 스텔라이즈" };

// Copy states only confirmed facts (README, PRODUCT.md, incross.com). No invented metrics.
// 기획자 피드백 11/7의 업무 흐름 그대로.
const FLOW = ["접수", "리스트업", "부킹", "제작", "업로드", "리포트 작성", "완료"];

const BEFORE = [
  { title: "한 캠페인에 다수의 크리에이터", body: "같은 캠페인 안에서도 사람마다 진행 단계가 제각각입니다." },
  { title: "시트, 슬랙, 메일에 흩어진 정보", body: "캠페인 하나의 진행 상황을 보려면 세 곳을 오가야 했습니다." },
  { title: "진행 상황은 메일로 확인", body: "어디까지 진행됐는지 매번 메일을 보내 물어봐야 했습니다." },
];

const AFTER = [
  { title: "누구를 기다리는지 보입니다", body: "크리에이터마다 광고주, 크리에이터, 우리 중 누구 차례인지와 며칠째인지 표시합니다." },
  { title: "늦어진 건이 먼저 보입니다", body: "마감 기한이 지난 건은 빨간색으로 표시하고, 캠페인 요약에 건수를 모읍니다." },
  { title: "날짜는 자동으로 계산합니다", body: "캠페인 진행 타임라인을 한국 시간 기준으로 셉니다." },
  { title: "크리에이터별 진행 체크", body: "부킹 요청부터 정산 서류, 기획안·가편안·수정본 컨펌, 업로드까지 단계가 끝날 때마다 체크합니다." },
  { title: "캠페인마다 대화방이 생깁니다", body: "크리에이터와 담당자의 방, 그 캠페인 담당자끼리의 방이 자동으로 만들어지고, 상대가 읽었는지 숫자로 보입니다." },
  { title: "대화 기록은 남습니다", body: "캠페인이 끝나면 대화방은 ‘끝난 캠페인’ 폴더로 옮겨지고, 주고받은 내용은 지우지 않고 보관합니다." },
];

// 기획자 11/11: 담당자와 크리에이터는 같은 로그인 화면으로 들어와 서로 다른 화면을 본다.
const ACCOUNTS = [
  {
    who: "스텔라이즈팀 담당자",
    body: "캠페인, 오늘 할 일, 계약서를 봅니다. 크리에이터별 진행을 체크하고 마감을 정하고, 크리에이터를 초대합니다.",
    how: "팀 가입 코드로 회원가입한 뒤 로그인합니다.",
    action: "담당자 로그인",
  },
  {
    who: "크리에이터",
    body: "내 일정만 봅니다. 참여 중인 캠페인의 단계와 마감을 확인하고, 기획안·가편안·수정본을 링크로 제출합니다.",
    how: "담당자가 보낸 초대 링크에서 가입한 뒤 로그인합니다.",
    action: "크리에이터 로그인",
  },
];

// 11/19: 휴대폰 홈 화면에 앱처럼 추가하는 법과 알림 켜는 법 (예전 "다음에 만들 것" 자리). Same steps as README "휴대폰 앱과 알림".
const MOBILE = [
  {
    who: "아이폰",
    steps: ["사파리로 허브 주소를 엽니다", "아래쪽 공유 버튼(네모에 화살표)을 누릅니다", "‘홈 화면에 추가’를 누릅니다", "홈 화면의 ‘캠페인 허브’로 엽니다"],
    note: "iOS 16.4 이상. 알림은 홈 화면에 추가한 앱에서만 켤 수 있습니다.",
  },
  {
    who: "안드로이드",
    steps: ["크롬으로 허브 주소를 엽니다", "오른쪽 위 ⋮ 메뉴를 누릅니다", "‘홈 화면에 추가’ 또는 ‘앱 설치’를 누릅니다", "홈 화면의 ‘캠페인 허브’로 엽니다"],
    note: "추가하지 않고 크롬에서 바로 써도 알림이 옵니다.",
  },
  {
    who: "알림 켜기",
    steps: ["로그인합니다", "담당자는 마이페이지 → 앱 알림, 크리에이터는 내 일정 맨 아래로 갑니다", "‘알림 켜기’를 누르고 허용합니다", "‘시험 알림 보내기’로 확인합니다"],
    note: "기기마다 한 번씩 켭니다. 로그아웃하면 그 기기의 알림이 꺼집니다.",
  },
];

// Sample cards in the opening band: the waiting party rotates, which is the product's whole idea in one motion.
const HERO_CARDS: { name: string; stage: string; states: [WaitingOn, number][]; indent: string }[] = [
  { name: "데일리민지", stage: "부킹 완료", states: [["creator", 1], ["us", 0], ["advertiser", 2]], indent: "" },
  { name: "지수의 화장대", stage: "기획안 컨펌", states: [["advertiser", 5], ["us", 0], ["creator", 1]], indent: "ml-14" },
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
        <SiteHeader />
        <div className={`${wrap} grid w-full flex-1 items-center gap-12 pb-20 pt-[140px] md:grid-cols-[1.25fr_1fr] lg:pt-[120px]`}>
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
              한 캠페인에 다수의 크리에이터, 그런 캠페인 여러 개를 동시에. 캠페인 허브는 스텔라이즈팀이 인플루언서 광고의 진행 상황을 한곳에서 관리하는 웹 도구입니다.
            </p>
            <Link
              href="/campaigns"
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
                        {days > 0 && <b className="font-medium text-ink-600">{days}일째</b>}
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
        <section aria-labelledby="accounts" className="border-b border-line">
          <div className={`${wrap} grid gap-10 py-16 md:grid-cols-[1fr_2.2fr] md:gap-20 md:py-24`}>
            <div data-reveal>
              <h2 id="accounts" className={h2}>
                로그인
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-800">담당자와 크리에이터는 같은 화면에서 로그인하고, 계정에 따라 서로 다른 화면이 열립니다.</p>
              {/* Keep in step with docs/setup.md "휴대폰에서 열기". The Wi-Fi limit goes away once the hub is on a server. */}
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
                휴대폰 브라우저로도 열 수 있습니다. 브라우저 메뉴에서 홈 화면에 추가하면 앱처럼 아이콘으로 엽니다. 인터넷 주소로 열리므로 와이파이가 달라도 됩니다.
              </p>
            </div>
            <div className="grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line">
              {ACCOUNTS.map((a, i) => (
                <article key={a.who} data-reveal style={delay(i * 140)} className="flex flex-col border-t-2 border-ink-900 pt-6 md:px-8 md:first:pl-0 md:last:pr-0">
                  <h3 className="text-[19px] font-bold text-ink-900 md:text-[21px]">{a.who}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-800">{a.body}</p>
                  {/* grows, so both buttons sit on the same line whatever the text length */}
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-600">{a.how}</p>
                  <Link href="/login" className="mt-6 inline-flex h-12 w-fit items-center bg-primary-600 px-6 text-[16px] font-bold text-white hover:bg-primary-700">
                    {a.action}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${wrap} py-20 md:py-32`}>
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-20">
            <h2 data-reveal className={h2}>
              스텔라이즈팀
            </h2>
            <p data-reveal style={delay(120)} className="text-[17px] leading-[1.8] text-ink-800 md:text-[19px]">
              스텔라이즈는 인플루언서 마케팅을 담당하는 부서입니다. 광고주가 광고를 의뢰하면 크리에이터 탐색부터 섭외와 계약,
              콘텐츠 제작과 업로드를 거쳐 성과 리포트가 나올 때까지 모든 과정을 관리합니다.
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
              alt="크리에이터 진행 현황 표. 크리에이터마다 다음 단계, 대기 주체와 대기 일수, 부킹 요청부터 리포트 작성까지 단계별 체크칸이 보인다."
              sizes="(min-width: 1260px) 1200px, 100vw"
              className="h-auto w-full border border-line"
              placeholder="blur"
            />
            <figcaption className="mt-4 text-[14px] text-ink-600">크리에이터 진행 현황 (예시 데이터)</figcaption>
          </figure>
        </section>

        <section aria-labelledby="mobile" className="border-t border-line bg-[#f5f7fa]">
          <div className={`${wrap} py-20 md:py-28`}>
            <div data-reveal className="max-w-2xl">
              <h2 id="mobile" className={h2}>
                휴대폰에서 앱처럼
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-800">
                설치할 앱은 따로 없습니다. 허브를 휴대폰 홈 화면에 추가하면 앱처럼 열리고, 새 메시지가 오면 사이트를 닫아 두어도 알림이 옵니다. 비용은 들지 않습니다.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-x-0 md:gap-y-0 md:divide-x md:divide-line">
              {MOBILE.map((m, i) => (
                // From 768px the three columns share one row grid (subgrid): a step that wraps to two lines makes
                // the same step taller in the other columns too, so every line stays level across the page.
                <article key={m.who} data-reveal style={delay(i * 140)} className="md:row-span-6 md:grid md:grid-rows-subgrid md:px-8 md:first:pl-0 md:last:pr-0">
                  <h3 className="border-b-2 border-ink-900 pb-3 text-[19px] font-bold text-ink-900 md:text-[21px]">{m.who}</h3>
                  <ol className="md:row-span-4 md:grid md:grid-rows-subgrid">
                    {m.steps.map((s, j) => (
                      <li key={s} className="flex gap-3 border-b border-line py-3 text-[16px] leading-relaxed text-ink-800">
                        <span className="w-5 shrink-0 pt-px text-[14px] font-bold tabular-nums text-primary-700">{j + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{m.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
