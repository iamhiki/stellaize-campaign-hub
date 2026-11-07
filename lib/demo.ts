import type { Stage } from "./date";

// shortcut: hard-coded sample data, no Supabase yet. Replace with queries when the schema exists.
// Shapes follow the README data model: Creator (DB) 1-N CampaignCreator N-1 Campaign.
export type WaitingOn = "advertiser" | "creator" | "us";
export type CheckItem = { id: string; label: string; done: boolean };

export type Creator = {
  id: string;
  name: string;
  channel: string;
  followers: string;
  avgViews: string;
  avgLikes: string;
  avgComments: string;
  audience: string;
  agency: string | null;
  business: "사업자" | "개인";
  tags: string[];
};

export type CampaignCreator = Pick<Creator, "name" | "channel" | "followers"> & {
  id: string;
  creatorId: string;
  stage: Stage;
  waitingOn: WaitingOn | null;
  waitingSince: string;
  uploadedAt: string | null;
  checklist: CheckItem[];
};

export type Campaign = {
  id: string;
  advertiser: string;
  brand: string;
  product: string;
  budget: string;
  channel: string;
  listDeadline: string;
  desiredUpload: string;
  confidential: boolean;
  owners: string[];
  creators: CampaignCreator[];
};

// The signed-in user until login exists. 홍가영 and 이세연 run this project.
export const CURRENT_USER = { name: "홍가영", team: "스텔라이즈" };

const items = (labels: string[], done: number): CheckItem[] =>
  labels.map((label, i) => ({ id: String(i), label, done: i < done }));

const LIST = ["단가 문의", "단가 회신"];
const CONFIRM = ["후보 리스트 전달", "광고주 컨펌"];
const BOOK = ["부킹 요청", "피저체크", "서류 수령", "날인본"];
const MAKE = ["기획안 컨펌", "초안 컨펌", "수정본 컨펌", "최종본 컨펌"];
const UPLOAD = ["링크·PA코드 수령", "리포트 작성 완료"];

export const creators: Creator[] = [
  { id: "cr01", name: "데일리민지", channel: "인스타그램", followers: "12.3만", avgViews: "4.1만", avgLikes: "2,300", avgComments: "140", audience: "20대 여성", agency: null, business: "개인", tags: ["데일리", "뷰티"] },
  { id: "cr02", name: "오늘의서연", channel: "유튜브 쇼츠", followers: "48.1만", avgViews: "15.2만", avgLikes: "9,800", avgComments: "420", audience: "20~30대 여성", agency: "스튜디오담", business: "사업자", tags: ["브이로그", "뷰티"] },
  { id: "cr03", name: "뷰티로그 하린", channel: "인스타그램", followers: "8.7만", avgViews: "2.6만", avgLikes: "1,450", avgComments: "88", audience: "20대 여성", agency: null, business: "개인", tags: ["메이크업"] },
  { id: "cr04", name: "피부결 연구소", channel: "유튜브", followers: "21.5만", avgViews: "6.8만", avgLikes: "3,100", avgComments: "260", audience: "20~30대", agency: "랩앤크루", business: "사업자", tags: ["스킨케어", "리뷰"] },
  { id: "cr05", name: "지수의 화장대", channel: "인스타그램", followers: "15.2만", avgViews: "3.9만", avgLikes: "2,050", avgComments: "97", audience: "20대 여성", agency: null, business: "개인", tags: ["뷰티", "일상"] },
  { id: "cr06", name: "무드메이크업", channel: "유튜브 쇼츠", followers: "33.0만", avgViews: "11.4만", avgLikes: "6,700", avgComments: "310", audience: "10~20대 여성", agency: "무드엔터", business: "사업자", tags: ["메이크업", "튜토리얼"] },
  { id: "cr07", name: "소담뷰티", channel: "인스타그램", followers: "6.4만", avgViews: "1.8만", avgLikes: "980", avgComments: "45", audience: "30대 여성", agency: null, business: "개인", tags: ["스킨케어"] },
  { id: "cr08", name: "윤슬로그", channel: "인스타그램", followers: "9.9만", avgViews: "2.9만", avgLikes: "1,600", avgComments: "72", audience: "20~30대 여성", agency: null, business: "개인", tags: ["일상", "감성"] },
  { id: "cr09", name: "집밥하는 도윤", channel: "유튜브", followers: "27.4만", avgViews: "9.1만", avgLikes: "4,200", avgComments: "380", audience: "30~40대", agency: "푸드랩", business: "사업자", tags: ["요리", "살림"] },
  { id: "cr10", name: "한끼연구소", channel: "인스타그램", followers: "18.6만", avgViews: "5.2만", avgLikes: "2,700", avgComments: "150", audience: "20~30대", agency: null, business: "개인", tags: ["요리", "레시피"] },
  { id: "cr11", name: "퇴근후요리", channel: "유튜브 쇼츠", followers: "41.2만", avgViews: "13.5만", avgLikes: "7,100", avgComments: "290", audience: "20~30대 직장인", agency: "데일리크루", business: "사업자", tags: ["요리", "자취"] },
  { id: "cr12", name: "런데이 지훈", channel: "인스타그램", followers: "7.3만", avgViews: "2.2만", avgLikes: "1,100", avgComments: "64", audience: "20~30대 남성", agency: null, business: "개인", tags: ["러닝", "운동"] },
  { id: "cr13", name: "달리는 소연", channel: "유튜브", followers: "12.8만", avgViews: "4.4만", avgLikes: "2,000", avgComments: "150", audience: "20~30대", agency: null, business: "개인", tags: ["러닝", "브이로그"] },
];

type EntrySeed = [creatorId: string, stage: Stage, waitingOn: WaitingOn | null, waitingDays: number, uploadedDaysAgo: number | null, checklist: CheckItem[]];

// Dates are relative to today so the demo keeps showing the same situations.
export function demo(today: string) {
  const shift = (n: number) => new Date(Date.parse(today) + n * 86_400_000).toISOString().slice(0, 10);
  const byId = new Map(creators.map((c) => [c.id, c]));
  const entries = (campaignId: string, seeds: EntrySeed[]): CampaignCreator[] =>
    seeds.map(([creatorId, stage, waitingOn, days, uploaded, checklist]) => {
      const { name, channel, followers } = byId.get(creatorId)!;
      return { id: `${campaignId}-${creatorId}`, creatorId, name, channel, followers, stage, waitingOn, waitingSince: shift(-days), uploadedAt: uploaded === null ? null : shift(-uploaded), checklist };
    });

  const campaigns: Campaign[] = [
    {
      id: "glowfit", advertiser: "뷰티랩", brand: "글로우핏", product: "수분 선크림", budget: "3,000만 원 (Fee 포함)", channel: "인스타그램 릴스",
      listDeadline: shift(3), desiredUpload: shift(24), confidential: true, owners: ["홍가영", "이세연"],
      creators: entries("glowfit", [
        ["cr01", "리스트업", "creator", 4, null, items(LIST, 1)],
        ["cr02", "리스트업", "us", 0, null, items(LIST, 2)],
        ["cr03", "광고주 컨펌", "advertiser", 2, null, items(CONFIRM, 1)],
        ["cr04", "섭외·계약", "creator", 1, null, items(BOOK, 2)],
        ["cr05", "제작", "advertiser", 5, null, items(MAKE, 1)],
        ["cr06", "제작", "us", 1, null, items(MAKE, 2)],
        ["cr07", "업로드", null, 0, 12, items(UPLOAD, 1)],
        ["cr08", "완료", null, 0, 28, items(UPLOAD, 2)],
      ]),
    },
    {
      id: "hankki", advertiser: "그린키친", brand: "한끼든든", product: "냉동 밀키트", budget: "1,500만 원 (NET)", channel: "유튜브 · 인스타그램",
      listDeadline: shift(1), desiredUpload: shift(30), confidential: false, owners: ["이세연"],
      creators: entries("hankki", [
        ["cr09", "리스트업", "creator", 3, null, items(LIST, 1)],
        ["cr10", "리스트업", "us", 0, null, items(LIST, 2)],
        ["cr11", "광고주 컨펌", "advertiser", 1, null, items(CONFIRM, 1)],
      ]),
    },
    {
      id: "runfit", advertiser: "핏앤런", brand: "에어런", product: "러닝화", budget: "2,000만 원 (Fee 포함)", channel: "인스타그램 릴스",
      listDeadline: shift(-20), desiredUpload: shift(-12), confidential: false, owners: ["홍가영"],
      creators: entries("runfit", [
        ["cr12", "업로드", null, 0, 12, items(UPLOAD, 1)],
        ["cr13", "완료", null, 0, 20, items(UPLOAD, 2)],
      ]),
    },
  ];
  return { campaigns, creators };
}
