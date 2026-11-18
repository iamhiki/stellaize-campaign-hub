import { readFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest } from "next/server";
import { fail, guard } from "@/lib/server/auth";

/** Fake documents for trying the contract app demo. Developer accounts only. */
const SAMPLE_NAMES = ["사업자등록증", "주민등록증", "통장사본"];

export async function GET(req: NextRequest) {
  const g = await guard(req, "dev");
  if (g.deny) return g.deny;
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (!SAMPLE_NAMES.includes(name)) return fail(404, "견본 서류를 찾을 수 없습니다.");
  const file = `견본_${name}.png`;
  const bytes = await readFile(path.join(process.cwd(), "samples", file));
  return new Response(bytes, {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file)}`, "Cache-Control": "no-store" },
  });
}
