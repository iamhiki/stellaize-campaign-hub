import { NextResponse, type NextRequest } from "next/server";
import { SUBMIT_STEPS, canSee } from "@/lib/campaigns";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { body, fail, guard, str } from "@/lib/server/auth";
import { readDb, supabase } from "@/lib/server/db";
import { writeUpload } from "@/lib/server/files";
import { ticket, ticketOk, type Purpose } from "@/lib/server/uploads";

/**
 * Step 1 of an upload (11/20): may this account put this file here? Answers with a key, a signed ticket and the
 * address the browser sends the bytes to. Then the browser tells /api/creator (제출본) or /api/template (양식).
 * - { purpose: "sub", entryId, step, name, size }: a creator's 기획안·가편안·수정본, on their own row
 * - { purpose: "template", campaignId, name, size }: 기획안 양식, by staff who may see the campaign
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  const purpose = b.purpose as Purpose;
  const name = str(b.name, 200);
  const size = typeof b.size === "number" ? b.size : -1;
  const db = await readDb();
  let target = "";
  if (purpose === "sub") {
    const entryId = str(b.entryId, 120);
    const step = b.step;
    if (g.user.role !== "creator") return fail(403, "제출은 크리에이터 계정으로 합니다.");
    if (typeof step !== "number" || !SUBMIT_STEPS.includes(step)) return fail(400, "제출할 수 없는 단계입니다.");
    if (!db.campaigns.some((c) => c.entries.some((e) => e.id === entryId && e.creatorId === g.user.id && !e.droppedAt))) return fail(404, "내 캠페인에서 찾을 수 없습니다.");
    target = `${entryId}#${step}`;
  } else if (purpose === "template") {
    const campaignId = str(b.campaignId, 120);
    const c = db.campaigns.find((x) => x.id === campaignId);
    if (g.user.role === "creator" || !c || !canSee(c, g.user.name)) return fail(403, "이 캠페인에 양식을 올릴 권한이 없습니다.");
    target = campaignId;
  } else return fail(400, "올릴 수 없는 파일입니다.");

  const t = await ticket(g.user.id, purpose, target, name, size);
  if ("error" in t) return fail(400, t.error!);
  return NextResponse.json({ ...t, target });
}

/** Step 2 on this machine only (no Supabase): the bytes themselves. With Supabase they go to storage instead. */
export async function PUT(req: NextRequest) {
  if (supabase) return fail(404, "없는 주소입니다.");
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const q = req.nextUrl.searchParams;
  const key = q.get("key") ?? "";
  const size = Number(q.get("s"));
  if (!ticketOk(g.user.id, q.get("p") as Purpose, q.get("g") ?? "", key, q.get("n") ?? "", size, q.get("t") ?? "")) return fail(403, "올릴 수 없는 파일입니다.");
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length !== size || bytes.length > MAX_UPLOAD_BYTES) return fail(400, "파일이 다 올라가지 않았습니다. 다시 시도해 주세요.");
  writeUpload(key, bytes);
  return NextResponse.json({ ok: true });
}
