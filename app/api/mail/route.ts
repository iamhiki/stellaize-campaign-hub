import { NextResponse, type NextRequest } from "next/server";
import { STEPS, canSee, dueList } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { isEmailOrEmpty } from "@/lib/ops";
import { body, fail, guard, newId, str } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";
import { mailReady, sendMail } from "@/lib/server/mail";

const addresses = (v: unknown) => (typeof v === "string" ? v.split(/[,\s]+/).filter(Boolean) : []);

/**
 * 11/14: 마감 알림은 자동으로 나가지 않는다. A staff member presses 메일 보내기, reads and edits the draft, and sends it.
 * The team address (MAIL_CC) is always copied (팀 규칙). A sent mail is kept on the creator's row.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "staff");
  if (g.deny) return g.deny;
  const b = await body(req);
  const campaignId = str(b.campaignId, 120);
  const entryId = str(b.entryId, 120);
  const step = b.step;
  const to = str(b.to, 120);
  const subject = str(b.subject, 200).replace(/[\r\n]+/g, " "); // one line: a subject can't carry extra mail headers
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 5000) : "";
  const cc = [...new Set([...addresses(b.cc), ...addresses(process.env.MAIL_CC)])].filter((v) => v !== to);

  if (typeof step !== "number" || !STEPS[step]) return fail(400, "보낼 수 없는 요청입니다.");
  if (!to || !isEmailOrEmpty(to)) return fail(400, "받는 사람 메일 주소를 확인해 주세요.");
  if (cc.length > 6 || !cc.every(isEmailOrEmpty)) return fail(400, "참조 메일 주소를 확인해 주세요. 여러 개면 쉼표로 나눕니다.");
  if (!subject || !text) return fail(400, "제목과 내용을 넣어 주세요.");

  const db = await readDb();
  const campaign = db.campaigns.find((c) => c.id === campaignId && canSee(c, g.user.name));
  const entry = campaign?.entries.find((e) => e.id === entryId);
  if (!campaign || !entry) return fail(404, "캠페인에서 크리에이터를 찾을 수 없습니다.");
  if (!mailReady) return fail(503, "메일 발송이 아직 연결되지 않았습니다. 보낼 메일 계정을 연결하면 이 버튼으로 나갑니다.");
  if (!(await sendMail({ to, cc, subject, text }))) return fail(502, "메일을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.");

  const today = todayKST();
  const id = newId();
  await mutate((d) => {
    d.notices.push({ id, key: `mail:${id}`, userId: entry.creatorId ?? "", campaignId, entryId, step, due: dueList(entry, campaign)[step] ?? "", createdAt: today, emailedAt: today });
  });
  return NextResponse.json({ ok: true });
}
