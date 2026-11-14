import { STEPS, dueList, type Notice } from "../campaigns";
import { isEmailOrEmpty } from "../ops";
import { todayKST } from "../date";
import { newId } from "./auth";
import { mutate, readDb, type Db } from "./db";
import { mailReady, sendMail } from "./mail";

/**
 * 기획자 11/11: 일정을 등록해 두고 마감을 안 지키면 알림. For every creator who has joined, each step that is theirs,
 * unchecked, and past its deadline gets one notice (per step and deadline, so a moved deadline can notify again).
 * The creator sees it on their screen, and sendNoticeMail below mails it once a mail service is set up
 * (`emailedAt` stays null until then).
 * Returns how many were added.
 */
export function queueNotices(db: Db, today: string) {
  const known = new Set(db.notices.map((n) => n.key));
  const fresh: Notice[] = [];
  for (const c of db.campaigns) {
    for (const e of c.entries) {
      if (e.droppedAt || !e.creatorId) continue;
      const dues = dueList(e, c);
      STEPS.forEach((s, step) => {
        const due = dues[step];
        if (s.waits !== "creator" || e.done[step] || !due || due >= today) return;
        const key = `${e.id}:${step}:${due}`;
        if (known.has(key)) return;
        fresh.push({ id: newId(), key, userId: e.creatorId!, campaignId: c.id, entryId: e.id, step, due, createdAt: today, emailedAt: null });
      });
    }
  }
  db.notices.push(...fresh);
  return fresh.length;
}

const short = (d: string) => d.slice(5).replace("-", "/");

/**
 * The mail for one notice, or null when it no longer applies (step done, creator dropped or unlinked).
 * To: the creator's account. Cc: the creator's 소속사 담당자 if staff entered one, and the team address in
 * MAIL_CC (팀 규칙: 팀메일을 항상 참조). The campaign's own 담당자 are not copied (11/14): they see it in 오늘 할 일.
 */
export function noticeMail(db: Db, n: Notice) {
  const campaign = db.campaigns.find((c) => c.id === n.campaignId);
  const entry = campaign?.entries.find((e) => e.id === n.entryId);
  const creator = db.users.find((u) => u.id === n.userId);
  if (!campaign || !entry || !creator || entry.droppedAt || entry.creatorId !== n.userId || entry.done[n.step]) return null;
  const team = (process.env.MAIL_CC ?? "").split(",").map((v) => v.trim());
  const cc = [...new Set([entry.managerEmail ?? "", ...team])].filter((v) => v && v !== creator.email && isEmailOrEmpty(v));
  const what = STEPS[n.step].label.replace(" 수급", "");
  const hub = process.env.HUB_URL?.trim().replace(/\/+$/, "");
  return {
    to: creator.email,
    cc,
    subject: `[스텔라이즈] ${campaign.name} ${what} 마감(${short(n.due)})이 지났습니다`,
    text: [
      `${creator.name} 님, 안녕하세요. 스텔라이즈팀입니다.`,
      "",
      `${campaign.name} 캠페인의 ${what} 마감일(${n.due})이 지났습니다.`,
      "업로드 일정이 정해져 있어 빠른 진행을 부탁드립니다. 일정이 어려우시면 담당자에게 가능한 날짜를 알려 주세요.",
      ...(hub ? ["", `제출과 일정 확인: ${hub}/creator`] : []),
      "",
      `담당: ${campaign.owners.join(", ")}`,
    ].join("\n"),
  };
}

let sending = false; // one pass at a time in this server, so two open screens don't mail the same notice twice

/** Mails every notice not mailed yet and records the day. Does nothing until RESEND_API_KEY and MAIL_FROM are set. */
export async function sendNoticeMail() {
  if (!mailReady || sending) return;
  sending = true;
  try {
    const db = await readDb();
    const sent: string[] = [];
    for (const n of db.notices) {
      if (n.emailedAt) continue;
      const mail = noticeMail(db, n);
      if (mail && (await sendMail(mail))) sent.push(n.id);
    }
    if (sent.length === 0) return;
    const today = todayKST();
    await mutate((d) => {
      for (const n of d.notices) if (sent.includes(n.id)) n.emailedAt = today;
    });
  } finally {
    sending = false;
  }
}
