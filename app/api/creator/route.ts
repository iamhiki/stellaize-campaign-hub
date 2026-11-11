import { NextResponse, type NextRequest } from "next/server";
import { SUBMIT_STEPS } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { body, fail, guard, newId, str } from "@/lib/server/auth";
import { creatorView, previewChoices, previewView } from "@/lib/server/creator";
import { mutate, readDb, type Db } from "@/lib/server/db";
import { queueNotices } from "@/lib/server/notices";

const send = (db: Db, userId: string) => NextResponse.json({ items: creatorView(db, userId) }, { headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  if (g.user.role === "staff") return fail(403, "이 화면을 볼 권한이 없습니다.");
  const today = todayKST();
  const read = await readDb();
  const db = queueNotices(read, today) > 0 ? await mutate((d) => (queueNotices(d, today), d)) : read;
  if (g.user.role === "creator") return send(db, g.user.id);
  // Developer: pick any row and see it as that creator would. Handing in a link stays creator-only (POST below).
  const entryId = req.nextUrl.searchParams.get("entry") ?? "";
  return NextResponse.json({ items: entryId ? previewView(db, entryId) : [], choices: previewChoices(db) }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * A creator hands in a link for 기획안, 가편안 or 수정본. The step is checked with today's date, the same as
 * staff checking "수급" by hand, so the row moves on to the advertiser's confirmation.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "creator");
  if (g.deny) return g.deny;
  const b = await body(req);
  const entryId = str(b.entryId, 120);
  const step = b.step;
  const note = str(b.note, 500);
  const raw = str(b.url, 1000);
  if (typeof step !== "number" || !SUBMIT_STEPS.includes(step)) return fail(400, "제출할 수 없는 단계입니다.");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail(400, "링크 주소를 확인해 주세요. https:// 로 시작해야 합니다.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fail(400, "링크 주소를 확인해 주세요. https:// 로 시작해야 합니다.");

  const out = await mutate((db) => {
    const campaign = db.campaigns.find((c) => c.entries.some((e) => e.id === entryId && e.creatorId === g.user.id && !e.droppedAt));
    const entry = campaign?.entries.find((e) => e.id === entryId);
    if (!campaign || !entry) return null; // not this creator's row
    const today = todayKST();
    db.submissions.push({ id: newId(), campaignId: campaign.id, entryId, step, url: url.href, note, at: today });
    if (!entry.done[step]) entry.done[step] = today;
    return db;
  });
  return out ? send(out, g.user.id) : fail(404, "내 캠페인에서 찾을 수 없습니다.");
}
