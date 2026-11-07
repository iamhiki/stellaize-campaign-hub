import { redirect } from "next/navigation";

// shortcut: there is only one (demo) campaign until Supabase is wired, so the list opens it directly.
export default function CampaignsPage() {
  redirect("/campaigns/demo");
}
