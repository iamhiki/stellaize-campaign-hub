import webpush from "web-push";
import { mutate, readDb } from "./db";

/**
 * App notifications (웹 푸시, 11/19): a new message shows on the phone or PC even with the hub closed, once that
 * device turned them on (마이페이지 · 내 일정 "알림 켜기"). Free: the browser makers run the push services.
 * Keys: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (.env.local, Vercel). Without them nothing is sent.
 * The message text travels encrypted to the device; the push service can't read it.
 */
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
export const pushReady = !!PUBLIC && !!PRIVATE;
if (pushReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "https://stellaize-campaign-hub.vercel.app", PUBLIC, PRIVATE);

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Send to every device of these accounts. Devices that are gone (unsubscribed, app removed) are forgotten. */
export async function notify(userIds: string[], msg: PushMessage) {
  if (!pushReady || !userIds.length) return;
  const want = new Set(userIds);
  const subs = ((await readDb()).pushSubs ?? []).filter((s) => want.has(s.userId));
  if (!subs.length) return;
  const payload = JSON.stringify(msg);
  const gone: string[] = [];
  await Promise.all(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 24 * 3600, urgency: "high" }).catch((e: { statusCode?: number }) => {
        if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint);
        else console.error("앱 알림 보내기 실패", e.statusCode ?? e);
      }),
    ),
  );
  if (gone.length) await mutate((db) => void (db.pushSubs = (db.pushSubs ?? []).filter((s) => !gone.includes(s.endpoint))));
}
