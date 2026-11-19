import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SaveError } from "@/components/SaveError";

export const metadata: Metadata = {
  title: "Campaign Hub │ 스텔라이즈",
  // 홈 화면에 추가 (app/manifest.ts). iPhone reads this instead of the manifest's name; its icon is app/apple-icon.png.
  appleWebApp: { capable: true, title: "캠페인 허브", statusBarStyle: "default" },
};
// The phone browser's bar takes the header blue; the site has no dark theme, so form controls stay light.
export const viewport: Viewport = { themeColor: "#125cad", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        {children}
        <SaveError />
      </body>
    </html>
  );
}
