import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import OverviewClient from "./overview.client";

const ALL = ["SUPER_ADMIN", "CITY_ADMIN", "BD"] as const;

export default async function Home() {
  try { await requireWorkspaceUser(ALL); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/" : "/login?error=forbidden"); }
  return <OverviewClient />;
}
