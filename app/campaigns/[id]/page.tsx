import { Suspense } from "react";
import { CampaignDetail } from "@/components/CampaignDetail";

export const metadata = { title: "캠페인 │ Campaign Hub │ 스텔라이즈" };

// Campaigns live in the browser until Supabase exists, so the page itself renders on the client.
export default function CampaignPage(props: PageProps<"/campaigns/[id]">) {
  return (
    <Suspense fallback={null}>
      <Campaign {...props} />
    </Suspense>
  );
}

async function Campaign({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  return <CampaignDetail id={id} />;
}
