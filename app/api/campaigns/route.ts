import { after, NextResponse, type NextRequest } from "next/server";
import { canSee } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { applyOp, parseOp } from "@/lib/ops";
import { body, fail, guard, newToken } from "@/lib/server/auth";
import { mutate, readDb, type Db } from "@/lib/server/db";
import { queueNotices, sendNoticeMail } from "@/lib/server/notices";

/**
 * What a staff screen gets: the campaigns this account may see (대외비 ones only for their 담당자), and the links,
 * notices, accounts and shipping info that belong to those campaigns.
 */
const snapshot = (db: Db, userName: string) => {
  const campaigns = db.campaigns.filter((c) => canSee(c, userName));
  const shown = new Set(campaigns.map((c) => c.id));
  const joined = new Map(db.users.filter((u) => u.role === "creator").map((u) => [u.id, u.name]));
  const accounts: Record<string, string> = {};
  // Shipping info and which documents are in, per row whose creator filled them in. The files themselves come from /api/files.
  const profiles: Record<string, { userId: string; legalName: string; phone: string; address: string; idDoc: boolean; bankCopy: boolean }> = {};
  for (const c of campaigns)
    for (const e of c.entries) {
      if (e.creatorId && joined.has(e.creatorId)) accounts[e.id] = joined.get(e.creatorId)!;
      const p = e.creatorId ? db.profiles?.[e.creatorId] : undefined;
      if (p) profiles[e.id] = { userId: e.creatorId!, legalName: p.legalName, phone: p.phone, address: p.address, idDoc: !!p.idDoc, bankCopy: !!p.bankCopy };
    }
  return {
    profiles,
    campaigns,
    submissions: db.submissions.filter((x) => shown.has(x.campaignId)),
    notices: db.notices.filter((n) => shown.has(n.campaignId)).map(({ id, entryId, step, due, createdAt, emailedAt }) => ({ id, entryId, step, due, createdAt, emailedAt })),
    /** entry id → the name on the linked creator account */
    accounts,
  };
};

const send = (db: Db, userName: string) => NextResponse.json(snapshot(db, userName), { headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  // No scheduler on this setup: passed deadlines are picked up whenever staff have the hub open.
  const today = todayKST();
  const db = await readDb();
  after(sendNoticeMail); // 기획자 11/13: 마감 알림은 메일로. Runs once the page has its answer.
  return send(queueNotices(db, today) > 0 ? await mutate((d) => (queueNotices(d, today), d)) : db, g.user.name);
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  const op = parseOp(await body(req));
  if (!op) return fail(400, "저장할 수 없는 요청입니다.");
  if (op.op === "invite" && op.token !== null) op.token = newToken();
  const target = "campaignId" in op ? op.campaignId : op.id;
  const name = g.user.name;
  const out = await mutate((db) => {
      // 대외비: a campaign this account can't see can't be changed either, and only a 담당자 sets or lifts 대외비.
      const existing = db.campaigns.find((c) => c.id === target);
      if (existing && (!canSee(existing, name) || (op.op === "setConfidential" && !existing.owners.includes(name)))) return null;
      db.campaigns = applyOp(db.campaigns, op, todayKST());
      if (op.op === "deleteCampaign") {
        db.submissions = db.submissions.filter((s) => s.campaignId !== op.id);
        db.notices = db.notices.filter((n) => n.campaignId !== op.id);
      }
      return db;
  });
  return out ? send(out, name) : fail(403, "이 캠페인을 바꿀 권한이 없습니다.");
}
