import { redirect } from "next/navigation";

// shortcut: the "today" dashboard isn't built yet, so / opens the demo board. Replace when the dashboard exists.
export default function Home() {
  redirect("/campaigns/demo");
}
