import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PageBand } from "@/components/PageBand";
import { TodayList, type TodayRow, type Bucket } from "@/components/TodayList";
import { OVERDUE_DAYS } from "@/components/badges";
import { daysBetween, reportDue, todayKST } from "@/lib/date";
import { CURRENT_USER, demo } from "@/lib/demo";

export const metadata = { title: "오늘 할 일 │ Campaign Hub │ 스텔라이즈" };

export default function TodayPage() {
  return (
    <Suspense fallback={null}>
      <Today />
    </Suspense>
  );
}

const SOON = 3; // deadlines this many days out or closer count as "today's work"

// README MVP 6: four buckets across campaigns. Rows carry `mine` so the page can switch 내 담당 / 전체.
const BUCKETS: Bucket[] = [
  { key: "drop", label: "드랍 후보", hint: `단가 회신 없음 (${OVERDUE_DAYS}일 이상 또는 리스트 마감 ${SOON}일 안)` },
  { key: "report", label: "리포트 작성", hint: `업로드 후 14일 마감 ${SOON}일 안` },
  { key: "deadline", label: "리스트 마감 임박", hint: `리스트 마감 ${SOON}일 안` },
  { key: "confirm", label: "컨펌 대기", hint: "광고주 회신을 기다리는 건" },
];

async function Today() {
  await connection();
  const today = todayKST();
  const campaigns = demo(today).campaigns;
  const rows: TodayRow[] = [];

  for (const c of campaigns) {
    const campaign = `${c.brand} ${c.product}`;
    const mine = c.owners.includes(CURRENT_USER.name);
    const listDays = daysBetween(today, c.listDeadline);
    const listOpen = c.creators.some((cc) => cc.stage === "리스트업" || cc.stage === "광고주 컨펌");
    for (const cc of c.creators) {
      const waitingDays = daysBetween(cc.waitingSince, today);
      const base = { entryId: cc.id, creator: cc.name, campaignId: c.id, campaign, mine, waitingOn: cc.waitingOn, waitingDays };
      if (cc.stage === "리스트업" && cc.waitingOn === "creator" && (waitingDays >= OVERDUE_DAYS || listDays <= SOON))
        rows.push({ ...base, kind: "drop", due: { label: "리스트 마감", days: listDays } });
      const reportDone = cc.checklist.find((i) => i.label === "리포트 작성 완료")?.done;
      if (cc.stage === "업로드" && cc.uploadedAt && !reportDone) {
        const days = daysBetween(today, reportDue(cc.uploadedAt));
        if (days <= SOON) rows.push({ ...base, kind: "report", due: { label: "리포트", days } });
      }
      if (cc.waitingOn === "advertiser") rows.push({ ...base, kind: "confirm", due: null });
    }
    if (listOpen && listDays >= 0 && listDays <= SOON)
      rows.push({ entryId: null, kind: "deadline", creator: null, campaignId: c.id, campaign, mine, waitingOn: null, waitingDays: 0, due: { label: "리스트 마감", days: listDays } });
  }

  return (
    <>
      <PageBand title="오늘 할 일">
        여러 캠페인에서 오늘 처리할 건만 모았습니다. 캠페인 하나를 자세히 보려면{" "}
        <Link href="/campaigns" className="underline underline-offset-4">
          캠페인
        </Link>
        으로 가세요.
      </PageBand>
      <TodayList buckets={BUCKETS} rows={rows} userName={CURRENT_USER.name} />
    </>
  );
}
