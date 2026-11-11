import { NextResponse, type NextRequest } from "next/server";
import { body, fail, guard, str } from "@/lib/server/auth";
import { findByInvite, link } from "@/lib/server/creator";
import { mutate, readDb } from "@/lib/server/db";

const GONE = "초대 링크가 만료됐거나 이미 사용됐습니다. 담당자에게 새 링크를 요청해 주세요.";

/** What an invite link is for, so the join page can say it before anyone signs up. */
export async function GET(req: NextRequest) {
  const found = findByInvite(readDb(), req.nextUrl.searchParams.get("t") ?? "");
  if (!found) return fail(404, GONE);
  return NextResponse.json({ campaign: found.campaign.name, creator: found.entry.name }, { headers: { "Cache-Control": "no-store" } });
}

/** A creator who already has an account adds another campaign to it. */
export async function POST(req: NextRequest) {
  const g = guard(req, "creator");
  if (g.deny) return g.deny;
  const token = str((await body(req)).invite, 100);
  const ok = mutate((db) => {
    const found = findByInvite(db, token);
    if (found) link(found.entry, g.user.id);
    return !!found;
  });
  return ok ? NextResponse.json({ ok: true }) : fail(404, GONE);
}
