import { addDays } from "./date";
import { STEPS, type Campaign, type Entry } from "./campaigns";

// The signed-in user until login exists. 홍가영 and 이세연 run this project.
export const CURRENT_USER = { name: "홍가영", team: "스텔라이즈팀" };

/**
 * Example campaigns shown until someone edits data in this browser. Dates are relative to today so the
 * demo keeps showing the same situations (waiting, due soon, overdue).
 */
export function demoCampaigns(today: string): Campaign[] {
  const shift = (n: number) => addDays(today, n);
  // checked = how many steps are done; lastAgo = days since the last one. Earlier steps are spaced 2 days apart.
  const entry = (campaignId: string, name: string, channel: string, checked: number, lastAgo: number): Entry => ({
    id: `${campaignId}-${name}`,
    name,
    channel,
    addedAt: shift(-(lastAgo + checked * 2)),
    done: STEPS.map((_, i) => (i < checked ? shift(-(lastAgo + (checked - 1 - i) * 2)) : null)),
    droppedAt: null,
    remindedAt: null,
  });

  return [
    {
      id: "glowfit", name: "글로우핏 수분 선크림", advertiser: "뷰티랩", channel: "인스타그램 릴스",
      uploadDate: shift(24), owners: ["홍가영", "이세연"], createdAt: shift(-14),
      entries: [
        entry("glowfit", "데일리민지", "인스타그램", 1, 4),
        entry("glowfit", "오늘의서연", "유튜브 쇼츠", 0, 0),
        entry("glowfit", "뷰티로그 하린", "인스타그램", 2, 2),
        entry("glowfit", "피부결 연구소", "유튜브", 4, 5),
        entry("glowfit", "지수의 화장대", "인스타그램", 6, 1),
        entry("glowfit", "무드메이크업", "유튜브 쇼츠", 7, 1),
        entry("glowfit", "소담뷰티", "인스타그램", 10, 12),
        entry("glowfit", "윤슬로그", "인스타그램", 11, 2),
      ],
    },
    {
      id: "hankki", name: "한끼든든 냉동 밀키트", advertiser: "그린키친", channel: "유튜브 · 인스타그램",
      uploadDate: shift(30), owners: ["이세연"], createdAt: shift(-7),
      entries: [
        entry("hankki", "집밥하는 도윤", "유튜브", 1, 3),
        entry("hankki", "한끼연구소", "인스타그램", 0, 0),
        entry("hankki", "퇴근후요리", "유튜브 쇼츠", 4, 1),
      ],
    },
    {
      id: "runfit", name: "에어런 러닝화", advertiser: "핏앤런", channel: "인스타그램 릴스",
      uploadDate: shift(-12), owners: ["홍가영"], createdAt: shift(-40),
      entries: [
        entry("runfit", "런데이 지훈", "인스타그램", 9, 13),
        entry("runfit", "달리는 소연", "유튜브", 10, 20),
      ],
    },
  ];
}
