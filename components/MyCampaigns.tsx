"use client";
import Link from "next/link";
import { CURRENT_USER } from "@/lib/demo";
import { useCampaigns } from "@/lib/store";
import { Loading } from "./PageBand";
import { ProgressBar } from "./ProgressBar";

export function MyCampaigns() {
  const campaigns = useCampaigns();
  if (!campaigns) return <div className="mt-5"><Loading /></div>;
  const mine = campaigns.filter((c) => c.owners.includes(CURRENT_USER.name));
  if (mine.length === 0) return <p className="mt-5 border-t-2 border-ink-900 py-6 text-[16px] text-ink-600">맡은 캠페인이 없습니다.</p>;
  return (
    <ul className="mt-5 border-t-2 border-ink-900">
      {mine.map((c, i) => (
        <li key={c.id} className="border-b border-line py-4">
          <Link href={`/campaigns/${c.id}`} className="font-semibold underline-offset-4 hover:text-primary-600 hover:underline">
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
