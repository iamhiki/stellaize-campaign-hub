import type { Stage } from "./date";

// shortcut: hard-coded sample data, no Supabase yet. Replace with a query when the schema exists.
export type WaitingOn = "advertiser" | "creator" | "us";
export type CheckItem = { id: string; label: string; done: boolean };
export type CampaignCreator = {
  id: string;
  name: string;
  channel: string;
  followers: string;
  stage: Stage;
  waitingOn: WaitingOn | null;
  waitingSince: string;
  uploadedAt: string | null;
  checklist: CheckItem[];
};

const items = (labels: string[], done: number): CheckItem[] =>
  labels.map((label, i) => ({ id: String(i), label, done: i < done }));

// Dates are relative to today so the demo keeps showing the same situations.
export function demo(today: string) {
const shift = (n: number) => new Date(Date.parse(today) + n * 86_400_000).toISOString().slice(0, 10);
const daysAgo = (n: number) => shift(-n);
const campaign = {
  id: "demo",
  advertiser: "뷰티랩",
  brand: "글로우핏",
  product: "수분 선크림",
  budget: "3,000만 원 (Fee 포함)",
  channel: "인스타그램 릴스",
  listDeadline: shift(3),
  desiredUpload: shift(24),
  confidential: true,
  owners: ["김하늘", "박지원"],
};

const creators: CampaignCreator[] = [
  { id: "c1", name: "데일리민지", channel: "인스타그램", followers: "12.3만", stage: "리스트업", waitingOn: "creator", waitingSince: daysAgo(4), uploadedAt: null, checklist: items(["단가 문의", "단가 회신"], 1) },
  { id: "c2", name: "오늘의서연", channel: "유튜브 쇼츠", followers: "48.1만", stage: "리스트업", waitingOn: "us", waitingSince: daysAgo(0), uploadedAt: null, checklist: items(["단가 문의", "단가 회신"], 2) },
  { id: "c3", name: "뷰티로그 하린", channel: "인스타그램", followers: "8.7만", stage: "광고주 컨펌", waitingOn: "advertiser", waitingSince: daysAgo(2), uploadedAt: null, checklist: items(["후보 리스트 전달", "광고주 컨펌"], 1) },
  { id: "c4", name: "피부결 연구소", channel: "유튜브", followers: "21.5만", stage: "섭외·계약", waitingOn: "creator", waitingSince: daysAgo(1), uploadedAt: null, checklist: items(["부킹 요청", "피저체크", "서류 수령", "날인본"], 2) },
  { id: "c5", name: "지수의 화장대", channel: "인스타그램", followers: "15.2만", stage: "제작", waitingOn: "advertiser", waitingSince: daysAgo(5), uploadedAt: null, checklist: items(["기획안 컨펌", "초안 컨펌", "수정본 컨펌", "최종본 컨펌"], 1) },
  { id: "c6", name: "무드메이크업", channel: "유튜브 쇼츠", followers: "33.0만", stage: "제작", waitingOn: "us", waitingSince: daysAgo(1), uploadedAt: null, checklist: items(["기획안 컨펌", "초안 컨펌", "수정본 컨펌", "최종본 컨펌"], 2) },
  { id: "c7", name: "소담뷰티", channel: "인스타그램", followers: "6.4만", stage: "업로드", waitingOn: null, waitingSince: daysAgo(0), uploadedAt: daysAgo(12), checklist: items(["링크·PA코드 수령", "리포트 작성 완료"], 1) },
  { id: "c8", name: "윤슬로그", channel: "인스타그램", followers: "9.9만", stage: "완료", waitingOn: null, waitingSince: daysAgo(0), uploadedAt: daysAgo(28), checklist: items(["링크·PA코드 수령", "리포트 작성 완료"], 2) },
];
return { campaign, creators };
}
