import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Shortcuts } from "@/components/Shortcuts";

export const metadata: Metadata = { title: "Campaign Hub │ 스텔라이즈" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <Shortcuts />
        {children}
      </body>
    </html>
  );
}
