import { readFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest } from "next/server";
import { fail, guard } from "@/lib/server/auth";

// Fake documents (견본) for the example creators, the same files as the contract app demo. Developer accounts only.
const SAMPLES: Record<string, string[]> = {
  데일리민지: ["주민등록증", "통장사본"],
  오늘의서연: ["사업자등록증", "통장사본"],
  "뷰티로그 하린": ["주민등록증", "통장사본"],
  "피부결 연구소": ["사업자등록증", "통장사본"],
  "지수의 화장대": ["주민등록증", "통장사본"],
  무드메이크업: ["사업자등록증", "통장사본"],
  소담뷰티: ["주민등록증", "통장사본"],
  윤슬로그: ["주민등록증", "통장사본"],
  "집밥하는 도윤": ["주민등록증", "통장사본"],
  한끼연구소: ["주민등록증", "통장사본"],
};

export async function GET(req: NextRequest) {
  const g = await guard(req, "dev");
  if (g.deny) return g.deny;
  const who = req.nextUrl.searchParams.get("who") ?? "";
  const doc = req.nextUrl.searchParams.get("doc") ?? "";
  // Only names from the list above reach the file path.
  if (!Object.hasOwn(SAMPLES, who) || !SAMPLES[who].includes(doc)) return fail(404, "견본 서류를 찾을 수 없습니다.");
  const bytes = await readFile(path.join(process.cwd(), "samples", who, `${doc}.png`));
  return new Response(bytes, {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`견본_${who}_${doc}.png`)}`, "Cache-Control": "no-store" },
  });
}
