import { NextResponse, type NextRequest } from "next/server";
import { canSee } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { body, fail, guard, str } from "@/lib/server/auth";
import { mutate } from "@/lib/server/db";
import { removeUpload } from "@/lib/server/files";
import { claim } from "@/lib/server/uploads";

/**
 * 기획안 양식 (기획자 11/20: 양식을 플랫폼에 등록해 놓고 "이대로 작성해 주세요"). campaignId "default" is the team's
 * 기본 양식, used by every campaign without its own; a campaign's own file wins. Staff put it up after
 * /api/uploads, creators download it from 내 일정. A new one replaces the old.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  const b = await body(req);
  const campaignId = str(b.campaignId, 120);
  const file = await claim(g.user.id, "template", campaignId, b.file);
  if (!file) return fail(400, "파일이 다 올라가지 않았습니다. 다시 올려 주세요.");
  const old = await mutate((db) => {
    if (campaignId === "default") {
      const before = db.defaultTemplate?.key;
      db.defaultTemplate = { ...file, at: todayKST() };
      return before ?? null;
    }
    const c = db.campaigns.find((x) => x.id === campaignId && canSee(x, g.user.name));
    if (!c) return undefined;
    const before = c.template?.key;
    c.template = { ...file, at: todayKST() };
    return before ?? null;
  });
  if (old === undefined) return fail(404, "캠페인을 찾을 수 없습니다.");
  if (old) await removeUpload(old).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  const campaignId = str((await body(req)).campaignId, 120);
  const old = await mutate((db) => {
    if (campaignId === "default") {
      const key = db.defaultTemplate?.key ?? null;
      delete db.defaultTemplate;
      return key;
    }
    const c = db.campaigns.find((x) => x.id === campaignId && canSee(x, g.user.name));
    const key = c?.template?.key ?? null;
    if (c) delete c.template;
    return key;
  });
  if (old) await removeUpload(old).catch(() => {});
  return NextResponse.json({ ok: true });
}
