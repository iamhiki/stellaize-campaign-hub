"use client";
// One WebSocket to Supabase Realtime for the "new message" signal (lib/server/chat.ts ping). No supabase-js: the
// hub only joins one public broadcast topic, which is a few lines of the Phoenix protocol Realtime speaks.
// The signal is only a nudge; screens still fetch messages from app/api/chat, and still check on a slow timer.

type Config = { url: string; key: string; topic: string };
const listeners = new Set<(key: string) => void>();
let ws: WebSocket | null = null;
let config: Config | null = null;
let ref = 0;
let beat: ReturnType<typeof setInterval> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
let joined = false;

const say = (topic: string, event: string, payload: unknown) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref) }));

function open() {
  if (!config || ws) return;
  const { url, key, topic } = config;
  ws = new WebSocket(`${url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`);
  ws.onopen = () => {
    say(`realtime:${topic}`, "phx_join", { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, private: false }, access_token: key });
    beat = setInterval(() => say("phoenix", "heartbeat", {}), 25_000);
  };
  ws.onmessage = (e) => {
    try {
      const m = JSON.parse(String(e.data));
      if (m.event === "phx_reply" && m.topic === `realtime:${topic}`) joined = m.payload?.status === "ok";
      if (m.event === "broadcast" && m.payload?.event === "msg" && typeof m.payload.payload?.k === "string") listeners.forEach((l) => l(m.payload.payload.k));
    } catch {}
  };
  ws.onclose = () => {
    clearInterval(beat);
    ws = null;
    joined = false;
    if (listeners.size) retry = setTimeout(open, 5_000);
  };
}

/** Start listening (once per page). Safe to call again with the same config. */
export function startLive(c: Config | null) {
  if (!c || config) return;
  config = c;
  open();
}

/** Called with a thread key each time any thread gets a message. Returns the unsubscribe. */
export function onLive(fn: (key: string) => void) {
  listeners.add(fn);
  open(); // reconnects if the last listener had closed it
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      clearTimeout(retry);
      ws?.close();
    }
  };
}

/** Whether the signal is connected right now (screens check less often when it is). */
export const liveOn = () => joined;
