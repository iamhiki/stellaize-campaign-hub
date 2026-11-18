"use client";
import { useMe } from "@/lib/me";

// Fake documents (견본) for the example creators, for trying the contract app demo.
// Only developer accounts see this; /api/samples refuses everyone else too. Keep in step with app/api/samples/route.ts.
const SAMPLES: [string, string[]][] = [
  ["데일리민지", ["주민등록증", "통장사본"]],
  ["오늘의서연", ["사업자등록증", "통장사본"]],
  ["뷰티로그 하린", ["주민등록증", "통장사본"]],
  ["피부결 연구소", ["사업자등록증", "통장사본"]],
  ["지수의 화장대", ["주민등록증", "통장사본"]],
  ["무드메이크업", ["사업자등록증", "통장사본"]],
  ["소담뷰티", ["주민등록증", "통장사본"]],
  ["윤슬로그", ["주민등록증", "통장사본"]],
  ["집밥하는 도윤", ["주민등록증", "통장사본"]],
  ["한끼연구소", ["주민등록증", "통장사본"]],
];

export function SampleDocs() {
  if (useMe()?.role !== "dev") return null;
  return (
    <section aria-labelledby="samples" className="mt-14">
      <h2 id="samples" className="text-[20px] font-bold tracking-[-0.03em] text-ink-900">
        견본 서류 (가짜) <span className="text-[14px] font-medium tracking-normal text-ink-600">개발자에게만 보임</span>
      </h2>
      <p className="mt-2 text-[15px] text-ink-600">예시 크리에이터 10명의 가짜 서류입니다. 계약서 앱 체험용이고, 실제 서류는 올리지 마세요.</p>
      <ul className="mt-4 border-t-2 border-ink-900">
        {SAMPLES.map(([who, docs]) => (
          <li key={who} className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line py-3 text-[15px]">
            <span className="w-36 font-semibold text-ink-900">{who}</span>
            {docs.map((doc) => (
              <a key={doc} href={`/api/samples?who=${encodeURIComponent(who)}&doc=${encodeURIComponent(doc)}`} className="min-h-9 content-center font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700">
                {doc}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
