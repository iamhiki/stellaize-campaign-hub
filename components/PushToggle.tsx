"use client";
import { useEffect, useState } from "react";
import { pushState, sendTest, turnOff, turnOn, type PushState } from "@/lib/push";
import { ui } from "./PageBand";

const SAY: Record<PushState, string> = {
  on: "이 기기에서 알림을 받고 있습니다. 새 메시지가 오면 사이트를 닫아 두어도 알려 드립니다.",
  off: "새 메시지가 오면 이 기기로 알림을 보냅니다. 사이트를 닫아 두어도 옵니다.",
  blocked: "이 브라우저에서 알림이 막혀 있습니다. 주소창 옆 자물쇠(사이트 설정)에서 알림을 ‘허용’으로 바꾼 뒤 다시 눌러 주세요.",
  "ios-home": "아이폰은 홈 화면에 추가한 앱에서만 알림이 옵니다. 사파리 아래 공유 버튼 → ‘홈 화면에 추가’를 누르고, 홈 화면의 캠페인 허브에서 다시 켜 주세요. (iOS 16.4 이상)",
  unsupported: "이 브라우저는 앱 알림을 지원하지 않습니다. 크롬·엣지·사파리(홈 화면 앱)에서 켜 주세요.",
  "no-key": "알림 설정이 아직 서버에 들어가지 않았습니다. 개발자에게 알려 주세요.",
};

/** 알림 켜기 (11/19): one device at a time; each phone or PC turns it on for itself. */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tested, setTested] = useState(false);

  useEffect(() => {
    let live = true;
    pushState().then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, []);

  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    setTested(false);
    const err = await fn().catch(() => "알림 설정을 바꾸지 못했습니다.");
    if (err) setError(err);
    setState(await pushState());
    setBusy(false);
  }

  return (
    <section aria-labelledby="push-title">
      <h2 id="push-title" className={compact ? "text-[16px] font-bold text-ink-900" : "text-[22px] font-bold tracking-[-0.03em] text-ink-900"}>
        앱 알림
      </h2>
      <div className={`flex flex-col gap-3 ${compact ? "mt-2" : "mt-5 border-t-2 border-ink-900 pt-5"}`}>
        <p className="text-[15px] leading-relaxed text-ink-800">{state ? SAY[state] : "확인하는 중…"}</p>
        <div className="flex flex-wrap gap-2 empty:hidden">
          {(state === "off" || state === "blocked") && (
            <button type="button" disabled={busy} onClick={() => run(turnOn)} className={`${ui.primary} h-11 px-5 text-[15px]`}>
              {busy ? "켜는 중…" : "알림 켜기"}
            </button>
          )}
          {state === "on" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const res = await sendTest();
                    if (!res.ok) return "시험 알림을 보내지 못했습니다.";
                    setTested(true);
                  })
                }
                className={`${ui.secondary} h-11 px-5 text-[15px]`}
              >
                시험 알림 보내기
              </button>
              <button type="button" disabled={busy} onClick={() => run(turnOff)} className={`${ui.secondary} h-11 px-5 text-[15px]`}>
                알림 끄기
              </button>
            </>
          )}
        </div>
        {tested && (
          <p role="status" className="text-[14px] text-ink-600">
            시험 알림을 보냈습니다. 몇 초 안에 오지 않으면 기기의 방해 금지 모드나 알림 설정을 확인해 주세요.
          </p>
        )}
        {error && (
          <p role="alert" className="text-[14px] font-semibold text-danger-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
