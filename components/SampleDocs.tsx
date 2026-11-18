"use client";
import { useMe } from "@/lib/me";

const NAMES = ["사업자등록증", "주민등록증", "통장사본"];

// Fake documents for the contract app demo. Only developer accounts see this (the files are guarded the same way).
export function SampleDocs() {
  if (useMe()?.role !== "dev") return null;
  return (
    <section aria-labelledby="samples" className="mt-14">
      <h2 id="samples" className="text-[20px] font-bold tracking-[-0.03em] text-ink-900">
        견본 서류 (가짜) <span className="text-[14px] font-medium tracking-normal text-ink-600">개발자에게만 보임</span>
      </h2>
      <p className="mt-2 text-[15px] text-ink-600">계약서 앱을 체험할 때 올리는 가짜 서류입니다. 실제 서류는 올리지 마세요.</p>
      <ul className="mt-4 flex flex-wrap gap-3">
        {NAMES.map((n) => (
          <li key={n}>
            <a href={`/api/samples?name=${encodeURIComponent(n)}`} className="inline-flex h-11 items-center border border-line bg-white px-4 text-[14px] font-semibold text-ink-800 hover:border-primary-600 hover:text-primary-600">
              {n} 받기
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
