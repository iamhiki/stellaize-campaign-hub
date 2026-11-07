import type { CSSProperties } from "react";
import { progressPct, type Stage } from "@/lib/date";

// Campaign progress: big percent, "완료 n/m명", and a bar that fills from the left.
export function ProgressBar({ label, stages, delay = 200, size = "md" }: { label: string; stages: Stage[]; delay?: number; size?: "md" | "lg" }) {
  const pct = progressPct(stages);
  const finished = stages.filter((s) => s === "완료").length;
  return (
    <div>
      <p className="flex items-baseline justify-between gap-3">
        <b className={`tracking-[-0.02em] text-ink-900 tabular-nums ${size === "lg" ? "text-[28px]" : "text-[20px]"}`}>{pct}%</b>
        <span className="text-[13px] text-ink-600 tabular-nums">
          완료 {finished}/{stages.length}명
        </span>
      </p>
      <div role="progressbar" aria-label={`${label} 진행률`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={`mt-2 bg-line ${size === "lg" ? "h-2" : "h-1.5"}`}>
        <div className="grow-x h-full bg-primary-600" style={{ width: `${pct}%`, "--delay": `${delay}ms` } as CSSProperties} />
      </div>
    </div>
  );
}
