import type { MetadataRoute } from "next";

/**
 * 홈 화면에 추가했을 때의 앱 (11/19): name, icon, and opening without the browser bar. On iPhone, app
 * notifications only work once the hub is added to the home screen this way (iOS 16.4+).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "스텔라이즈 캠페인 허브",
    short_name: "캠페인 허브",
    description: "캠페인 진행 현황, 오늘 할 일, 크리에이터·팀원 대화",
    start_url: "/campaigns",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#125cad",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
