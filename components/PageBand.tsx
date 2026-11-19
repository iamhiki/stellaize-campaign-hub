import { SiteHeader } from "./SiteHeader";

// Incross visual language: blue band with the GNB and a tight headline. Stellaize primary-700 -> primary-600
// keeps white text >= 4.5:1 across the band. Kept low so the work sits above the fold.
// `center` is for the pages that are one narrow form (로그인, 가입, 초대): text and form share the middle.
export function PageBand({ title, children, center }: { title: React.ReactNode; children?: React.ReactNode; center?: boolean }) {
  return (
    <section className="relative bg-[linear-gradient(103deg,#125cad_0%,#1876d6_100%)] text-white">
      <SiteHeader />
      <div className={`mx-auto px-5 pb-8 pt-[120px] md:px-[30px] lg:pt-[96px] ${center ? "max-w-[620px] text-center" : "max-w-[1260px]"}`}>
        <h1 className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${center ? "justify-center" : ""} text-[30px] font-bold leading-tight tracking-[-0.04em] wrap-anywhere md:text-[40px]`}>{title}</h1>
        {children && <div className="mt-2 text-balance text-[15px] font-medium leading-relaxed wrap-anywhere md:text-[17px]">{children}</div>}
      </div>
    </section>
  );
}

export const pageWrap = "mx-auto max-w-[1260px] px-5 md:px-[30px]";

// Incross board_list: 2px dark top rule, 1px row lines, recolored to Stellaize grays.
export const table = {
  wrap: "w-full min-w-[720px] border-t-2 border-ink-900 text-[15px]",
  th: "border-b border-line bg-[#f5f7fa] px-3 py-3 text-left text-[14px] font-semibold text-ink-800",
  td: "border-b border-line px-3 py-4 align-top text-ink-800",
};

// Forms and buttons in the same square, line-ruled language.
export const ui = {
  label: "flex flex-col gap-2 text-[15px] font-medium text-ink-800",
  input: "h-12 min-w-0 border border-line bg-white px-4 text-[16px] text-ink-900 placeholder:text-ink-600 hover:border-line-strong focus:border-primary-600 focus:outline-none",
  primary: "inline-flex h-12 shrink-0 items-center justify-center bg-primary-600 px-6 text-[16px] font-bold text-white hover:bg-primary-700",
  secondary: "inline-flex h-12 shrink-0 items-center justify-center border border-line bg-white px-6 text-[16px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600",
};

/** Shown until the server answers, so the layout doesn't jump. */
export function Loading() {
  return <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">불러오는 중…</p>;
}
