import { NextResponse, type NextRequest } from "next/server";
import { SUBMIT_STEPS } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { body, fail, guard, newId, str } from "@/lib/server/auth";
import { creatorView, previewChoices, previewView } from "@/lib/server/creator";
import { mutate, readDb, type Db } from "@/lib/server/db";
import { claim } from "@/lib/server/uploads";

const MAX_TEXT = 10000; // 기획안을 글로 쓸 때 (11/20)

const send = (db: Db, userId: string) => NextResponse.json({ items: creatorView(db, userId) }, { headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  if (g.user.role === "staff") return fail(403, "이 화면을 볼 권한이 없습니다.");
  const db = await readDb();
  if (g.user.role === "creator") return send(db, g.user.id);
  // Developer: pick any row and see it as that creator would. Handing in a link stays creator-only (POST below).
  const entryId = req.nextUrl.searchParams.get("entry") ?? "";
  return NextResponse.json({ items: entryId ? previewView(db, entryId, g.user.name) : [], choices: previewChoices(db, g.user.name) }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * A creator hands in 기획안, 가편안 or 수정본 in one of three ways: a link (`url`), a file already put into storage
 * with an upload ticket (`file`, 11/20), or text typed in the hub (`text`, 11/20: 텍스트로 막 주면). The step is
 * checked with today's date, the same as staff checking "수급" by hand, so the row moves on to the advertiser.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "creator");
  if (g.deny) return g.deny;
  const b = await body(req);
  const entryId = str(b.entryId, 120);
  const step = b.step;
  const note = str(b.note, 500);
  if (typeof step !== "number" || !SUBMIT_STEPS.includes(step)) return fail(400, "제출할 수 없는 단계입니다.");
  let link = "";
  let file: Awaited<ReturnType<typeof claim>> = null;
  let text = "";
  if (b.file) {
    file = await claim(g.user.id, "sub", `${entryId}#${step}`, b.file);
    if (!file) return fail(400, "파일이 다 올라가지 않았습니다. 다시 올려 주세요.");
  } else if (typeof b.text === "string") {
    text = b.text.trim().slice(0, MAX_TEXT);
    if (!text) return fail(400, "내용을 입력해 주세요.");
  } else {
    let url: URL;
    try {
      url = new URL(str(b.url, 1000));
    } catch {
      return fail(400, "링크 주소를 확인해 주세요. https:// 로 시작해야 합니다.");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return fail(400, "링크 주소를 확인해 주세요. https:// 로 시작해야 합니다.");
    link = url.href;
  }

  const out = await mutate((db) => {
    const campaign = db.campaigns.find((c) => c.entries.some((e) => e.id === entryId && e.creatorId === g.user.id && !e.droppedAt));
    const entry = campaign?.entries.find((e) => e.id === entryId);
    if (!campaign || !entry) return null; // not this creator's row
    const today = todayKST();
    db.submissions.push({ id: newId(), campaignId: campaign.id, entryId, step, url: link, note, at: today, ...(file ? { file } : {}), ...(text ? { text } : {}) });
    if (!entry.done[step]) entry.done[step] = today;
    return db;
  });
  return out ? send(out, g.user.id) : fail(404, "내 캠페인에서 찾을 수 없습니다.");
}
