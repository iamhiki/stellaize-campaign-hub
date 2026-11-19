import { NextResponse, type NextRequest } from "next/server";
import { canSee } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { applyOp, parseOp } from "@/lib/ops";
import { body, fail, guard, newToken } from "@/lib/server/auth";
import { mutate, readDb, type Db } from "@/lib/server/db";
import { dropCampaign } from "@/lib/server/chat";
import { mailReady } from "@/lib/server/mail";

/**
 * What a staff screen gets: the campaigns this account may see (대외비 ones only for their 담당자), and the links,
 * notices, accounts and shipping info that belong to those campaigns.
 */
const snapshot = (db: Db, userName: string) => {
  const campaigns = db.campaigns.filter((c) => canSee(c, userName));
  const shown = new Set(campaigns.map((c) => c.id));
  const joined = new Map(db.users.filter((u) => u.role === "creator").map((u) => [u.id, u.name]));
  const accounts: Record<string, string> = {};
  const emails: Record<string, string> = {}; // entry id → the linked creator's login mail, where 메일 보내기 starts from
  const mailOf = new Map(db.users.map((u) => [u.id, u.email]));
  // Shipping info and which documents are in, per row whose creator filled them in. The files themselves come from /api/files.
  const profiles: Record<string, { userId: string; legalName: string; phone: string; address: string; idDoc: boolean; bankCopy: boolean }> = {};
  for (const c of campaigns)
    for (const e of c.entries) {
      if (e.creatorId && joined.has(e.creatorId)) {
        accounts[e.id] = joined.get(e.creatorId)!;
        emails[e.id] = mailOf.get(e.creatorId)!;
      }
      const p = e.creatorId ? db.profiles?.[e.creatorId] : undefined;
      if (p) profiles[e.id] = { userId: e.creatorId!, legalName: p.legalName, phone: p.phone, address: p.address, idDoc: !!p.idDoc, bankCopy: !!p.bankCopy };
    }
  return {
    profiles,
    campaigns,
    submissions: db.submissions.filter((x) => shown.has(x.campaignId)),
    emails,
    /** Whether a mail service is connected, and the team address every reminder is copied to. */
    mail: { ready: mailReady, teamCc: (process.env.MAIL_CC ?? "").trim() },
    // Only mails that went out. Rows from the earlier automatic notices (never mailed) are left out.
    notices: db.notices.filter((n) => shown.has(n.campaignId) && n.emailedAt).map(({ id, entryId, step, due, createdAt, emailedAt }) => ({ id, entryId, step, due, createdAt, emailedAt })),
    /** entry id → the name on the linked creator account */
    accounts,
    /** Names on 담당자·개발자 accounts, offered when picking a campaign's 담당자 (기획자 11/19). Names only, no mails. */
    staffNames: [...new Set(db.users.filter((u) => u.role !== "creator").map((u) => u.name))].sort((a, b) => a.localeCompare(b, "ko")),
  };
};

const send = (db: Db, userName: string) => NextResponse.json(snapshot(db, userName), { headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  return send(await readDb(), g.user.name);
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
        db.messages = db.messages?.filter((m) => m.campaignId !== op.id);
      }
      return db;
  });
  if (out && op.op === "deleteCampaign") await dropCampaign(op.id).catch((e) => console.error("대화 삭제 실패", e));
  return out ? send(out, name) : fail(403, "이 캠페인을 바꿀 권한이 없습니다.");
}
