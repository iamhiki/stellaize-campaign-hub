// shortcut: mail goes out through Resend's HTTP API (one fetch, no package). If the company hands over a mailbox
// (SMTP login) instead of a sending domain, swap this one function for nodemailer.
const KEY = process.env.RESEND_API_KEY?.trim();
const FROM = process.env.MAIL_FROM?.trim();

export const mailReady = !!KEY && !!FROM;

/** Sends one plain-text mail. Resolves to whether the mail service accepted it. */
export async function sendMail(mail: { to: string; cc: string[]; subject: string; text: string }) {
  if (!mailReady) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [mail.to], cc: mail.cc.length ? mail.cc : undefined, subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) console.error(`마감 알림 메일 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.ok;
  } catch (e) {
    console.error("마감 알림 메일 실패", e);
    return false;
  }
}
