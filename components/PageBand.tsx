import { SiteHeader } from "./SiteHeader";
import { CURRENT_USER } from "@/lib/demo";

// Incross visual language: blue band with the GNB and a tight headline. Stellaize primary-700 -> primary-600
// keeps white text >= 4.5:1 across the band. Kept low so the work sits above the fold.
export function PageBand({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative bg-[linear-gradient(103deg,#125cad_0%,#1876d6_100%)] text-white">
      <SiteHeader userName={`${CURRENT_USER.name} 님`} />
      <div className="mx-auto max-w-[1260px] px-5 pb-8 pt-[120px] md:px-[30px] md:pt-[96px]">
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[30px] font-bold leading-tight tracking-[-0.04em] md:text-[40px]">{title}</h1>
        {children && <div className="mt-2 text-[15px] font-medium leading-relaxed md:text-[17px]">{children}</div>}
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
