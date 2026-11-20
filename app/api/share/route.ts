import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { canSee } from "@/lib/campaigns";
import { body, fail, guard, str } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";
import { sendStored } from "@/lib/server/send-file";

/**
 * 광고주에게 넘기기 (기획자 11/20: 크리에이터가 올린 걸 받아서 광고주한테 넘긴다). Staff make a link for one
 * uploaded hand-in; whoever has the link downloads that one file, without an account, for 7 days. Only the
 * digest of the token is kept, like sessions, and a link opens nothing else.
 */
const LIFE = 7 * 24 * 3600_000;
const digest = (t: string) => createHash("sha256").update(t).digest("hex");

export async function POST(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  const subId = str((await body(req)).subId, 40);
  const token = randomBytes(24).toString("base64url");
  const exp = Date.now() + LIFE;
  const ok = await mutate((db) => {
    const s = db.submissions.find((x) => x.id === subId);
    const c = s && db.campaigns.find((x) => x.id === s.campaignId);
    if (!s?.file || !c || !canSee(c, g.user.name)) return false;
    const now = Date.now();
    db.shares = Object.fromEntries(Object.entries(db.shares ?? {}).filter(([, v]) => v.exp > now));
    db.shares[digest(token)] = { subId, exp, by: g.user.id };
    return true;
  });
  if (!ok) return fail(404, "넘길 파일을 찾을 수 없습니다.");
  return NextResponse.json({ link: `${req.nextUrl.origin}/api/share?t=${token}`, until: new Date(exp).toISOString() });
}

/** The advertiser's side: no login, just the link. */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const db = await readDb();
  const share = t ? db.shares?.[digest(t)] : undefined;
  if (!share || share.exp < Date.now()) return new NextResponse("링크가 만료됐거나 잘못됐습니다. 담당자에게 새 링크를 요청해 주세요.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const s = db.submissions.find((x) => x.id === share.subId);
  if (!s?.file?.key) return new NextResponse("파일을 찾을 수 없습니다.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return sendStored(s.file.key, s.file.name, s.file.type, 600);
}
