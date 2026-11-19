"use client";
import Link from "next/link";
import { useMe } from "@/lib/me";
import { useCampaigns } from "@/lib/store";
import { Loading } from "./PageBand";
import { ProgressBar } from "./ProgressBar";

export function MyCampaigns() {
  const campaigns = useCampaigns();
  const me = useMe();
  if (!campaigns || !me) return <div className="mt-5"><Loading /></div>;
  const mine = campaigns.filter((c) => c.owners.includes(me.name));
  if (mine.length === 0) return <p className="mt-5 border-t-2 border-ink-900 py-6 text-[16px] text-ink-600">맡은 캠페인이 없습니다. 캠페인 담당자 칸에 내 이름({me.name})이 있으면 여기에 모입니다.</p>;
  return (
    <ul className="mt-5 border-t-2 border-ink-900">
      {mine.map((c, i) => (
        <li key={c.id} className="border-b border-line py-4">
          <Link href={`/campaigns/${c.id}`} className="font-semibold underline-offset-4 wrap-anywhere hover:text-primary-600 hover:underline">
            {c.name}
          </Link>
          <div className="mt-2">
            <ProgressBar label={c.name} entries={c.entries} delay={200 + i * 120} />
          </div>
        </li>
      ))}
    </ul>
  );
}
