"use client";
import { contractLink } from "@/lib/contract";
import { useCampaigns } from "@/lib/store";
import { Loading, table } from "./PageBand";

const base = "inline-flex min-h-9 items-center whitespace-nowrap text-[14px] font-semibold underline underline-offset-4";
const link = `${base} text-primary-600 hover:text-primary-700`;

// Pick the campaign and creator here; their names travel to the contract app so they aren't typed twice.
export function ContractPicker() {
  const campaigns = useCampaigns();
  if (!campaigns) return <Loading />;
  if (campaigns.length === 0) return <p className="border-t-2 border-ink-900 py-10 text-center text-[16px] text-ink-600">등록한 캠페인이 없습니다.</p>;

  return (
    <div className="overflow-x-auto">
      <table className={table.wrap}>
        <thead>
          <tr>
            {["캠페인", "광고주", "업로드 날짜", "크리에이터"].map((h) => (
              <th key={h} className={table.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const live = c.entries.filter((e) => !e.droppedAt);
            return (
              <tr key={c.id}>
                <td className={`${table.td} font-bold text-ink-900`}>{c.name}</td>
                <td className={table.td}>{c.advertiser}</td>
                <td className={`${table.td} whitespace-nowrap tabular-nums`}>{c.uploadDate}</td>
                <td className={table.td}>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1">
                    {live.map((e) => (
                      <li key={e.id}>
                        <a href={contractLink(c, e)} target="_blank" rel="noopener noreferrer" className={link}>
                          {e.name}
                          <span aria-hidden>↗</span>
                        </a>
                      </li>
                    ))}
                    <li>
                      <a href={contractLink(c)} target="_blank" rel="noopener noreferrer" className={`${base} text-ink-600 hover:text-primary-600`}>
                        크리에이터 없이 열기
                      </a>
                    </li>
                  </ul>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* shortcut: the contract app runs on each PC (개인정보), so the link only opens while it is running there. Host it to make this one click. */}
      <p className="mt-3 text-[13px] text-ink-600">&ldquo;연결을 거부했습니다&rdquo;가 뜨면 내 PC에서 계약서 앱을 먼저 켜 주세요.</p>
    </div>
  );
}
