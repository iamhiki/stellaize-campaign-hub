"use client";

/**
 * 앱 알림 켜기·끄기 in the browser (11/19). The server side is app/api/push and lib/server/push.ts.
 * iPhone: only inside the hub added to the home screen (iOS 16.4+); in a Safari tab PushManager is missing.
 */
const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "unsupported" | "ios-home" | "blocked" | "off" | "on" | "no-key";

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function pushState(): Promise<PushState> {
  if (!KEY) return "no-key";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return isIos() && !standalone() ? "ios-home" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

const key = () => {
  const s = atob(KEY.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(KEY.length / 4) * 4, "="));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Ask permission, subscribe this device and tell the server. Returns the error to show, or "". */
export async function turnOn(): Promise<string> {
  if ((await Notification.requestPermission()) !== "granted") return "알림이 허용되지 않았습니다. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() }));
  const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) }).catch(() => null);
  return res?.ok ? "" : "알림을 켜지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

/** Unsubscribe this device and tell the server (알림 끄기, and on 로그아웃). Never throws. */
export async function turnOff() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
    await sub.unsubscribe();
  } catch {
    // nothing to undo
  }
}

export const sendTest = () => fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: true }) });
