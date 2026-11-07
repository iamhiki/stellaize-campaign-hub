import { redirect } from "next/navigation";

// The first page anyone opens is the introduction; the work starts from its buttons or the menu.
export default function Home() {
  redirect("/about");
}
