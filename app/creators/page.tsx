import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PageBand, pageWrap, table } from "@/components/PageBand";
import { todayKST } from "@/lib/date";
import { demo } from "@/lib/demo";

export const metadata = { title: "크리에이터 DB │ Campaign Hub │ 스텔라이즈" };

export default function CreatorsPage() {
  return (
    <Suspense fallback={null}>
      <Creators />
    </Suspense>
  );
}

async function Creators() {
  await connection();
  const { campaigns, creators } = demo(todayKST());
  const joined = (id: string) => campaigns.filter((c) => c.creators.some((cc) => cc.creatorId === id));

  return (
    <>
      <PageBand title="크리에이터 DB">
        리스트업할 때 찾아보는 크리에이터 목록입니다. 평균 조회수·좋아요·댓글은 사내 채널 분석 프로그램 결과를 옮겨 적은 값입니다. 지금은 예시 데이터 {creators.length}명입니다.
      </PageBand>
      <main className={`${pageWrap} py-10 md:py-14`}>
        <div className="overflow-x-auto">
          <table className={`${table.wrap} min-w-[1080px]`}>
            <thead>
              <tr>
                {["크리에이터", "팔로워", "평균 조회수", "평균 좋아요", "평균 댓글", "주 시청층", "분위기", "소속사", "구분", "참여 캠페인"].map((h, i) => (
                  <th key={h} className={`${table.th} ${i >= 1 && i <= 4 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id}>
                  <td className={table.td}>
                    <span className="block font-bold text-ink-900">{c.name}</span>
                    <span className="text-[13px] text-ink-600">{c.channel}</span>
                  </td>
                  {[c.followers, c.avgViews, c.avgLikes, c.avgComments].map((v, i) => (
                    <td key={i} className={`${table.td} text-right tabular-nums`}>
                      {v}
                    </td>
                  ))}
                  <td className={table.td}>{c.audience}</td>
                  <td className={`${table.td} text-[14px] text-ink-600`}>{c.tags.join(" · ")}</td>
                  <td className={table.td}>{c.agency ?? <span className="text-ink-600">없음</span>}</td>
                  <td className={table.td}>{c.business}</td>
                  <td className={table.td}>
                    {joined(c.id).map((cp) => (
                      <Link key={cp.id} href={`/campaigns/${cp.id}`} className="block text-[14px] underline-offset-4 hover:text-primary-600 hover:underline">
                        {cp.brand} {cp.product}
                      </Link>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
