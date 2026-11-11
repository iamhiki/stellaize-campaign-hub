import { NextResponse, type NextRequest } from "next/server";
import { todayKST } from "@/lib/date";
import { applyOp, parseOp } from "@/lib/ops";
import { body, fail, guard, newToken } from "@/lib/server/auth";
import { mutate, readDb, type Db } from "@/lib/server/db";
import { queueNotices } from "@/lib/server/notices";

/** What staff screens get: every campaign, the links creators handed in, and the deadline notices so far. */
const snapshot = (db: Db) => {
  const joined = new Map(db.users.filter((u) => u.role === "creator").map((u) => [u.id, u.name]));
  const accounts: Record<string, string> = {};
  for (const c of db.campaigns) for (const e of c.entries) if (e.creatorId && joined.has(e.creatorId)) accounts[e.id] = joined.get(e.creatorId)!;
  return {
    campaigns: db.campaigns,
    submissions: db.submissions,
    notices: db.notices.map(({ id, entryId, step, due, createdAt, emailedAt }) => ({ id, entryId, step, due, createdAt, emailedAt })),
    /** entry id → the name on the linked creator account */
    accounts,
  };
};

const send = (db: Db) => NextResponse.json(snapshot(db), { headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  // No scheduler on this setup: passed deadlines are picked up whenever staff have the hub open.
  const today = todayKST();
  const db = await readDb();
  return send(queueNotices(db, today) > 0 ? await mutate((d) => (queueNotices(d, today), d)) : db);
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  const op = parseOp(await body(req));
  if (!op) return fail(400, "저장할 수 없는 요청입니다.");
  if (op.op === "invite" && op.token !== null) op.token = newToken();
  return send(
    await mutate((db) => {
      db.campaigns = applyOp(db.campaigns, op, todayKST());
      if (op.op === "deleteCampaign") {
        db.submissions = db.submissions.filter((s) => s.campaignId !== op.id);
        db.notices = db.notices.filter((n) => n.campaignId !== op.id);
      }
      return db;
    }),
  );
}
