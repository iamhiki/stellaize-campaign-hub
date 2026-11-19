import { NextResponse, type NextRequest } from "next/server";
import { body, fail, guard, str } from "@/lib/server/auth";
import { mutate } from "@/lib/server/db";
import { notify, pushReady } from "@/lib/server/push";

const MAX_DEVICES = 10; // per account; the oldest goes first

/** Whether the server can send app notifications at all. */
export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  return NextResponse.json({ ready: pushReady }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Turn this device on for the signed-in account: { subscription } from the browser's PushManager. A device
 * belongs to one account at a time, so signing in as someone else on it moves it. { test: true } sends a test.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  if (b.test) {
    await notify([g.user.id], { title: "알림이 켜졌습니다", body: "새 메시지가 오면 이렇게 알려 드립니다.", url: "/chat", tag: "test" });
    return NextResponse.json({ ok: true });
  }
  const sub = b.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const endpoint = str(sub?.endpoint, 1000);
  const p256dh = str(sub?.keys?.p256dh, 200);
  const auth = str(sub?.keys?.auth, 100);
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return fail(400, "알림을 켤 수 없는 기기입니다.");
  await mutate((db) => {
    const rest = (db.pushSubs ?? []).filter((s) => s.endpoint !== endpoint);
    const mine = rest.filter((s) => s.userId === g.user.id);
    const drop = new Set(mine.slice(0, Math.max(0, mine.length - (MAX_DEVICES - 1))).map((s) => s.endpoint));
    db.pushSubs = [...rest.filter((s) => !drop.has(s.endpoint)), { endpoint, keys: { p256dh, auth }, userId: g.user.id, at: new Date().toISOString() }];
  });
  return NextResponse.json({ ok: true });
}

/** Turn this device off: { endpoint }. Also called on 로그아웃, so the next person on the device gets nothing. */
export async function DELETE(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const endpoint = str((await body(req)).endpoint, 1000);
  await mutate((db) => void (db.pushSubs = (db.pushSubs ?? []).filter((s) => !(s.endpoint === endpoint && s.userId === g.user.id))));
  return NextResponse.json({ ok: true });
}
