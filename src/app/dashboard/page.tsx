import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "./page.client";

const ALL = ["SUPER_ADMIN", "CITY_ADMIN", "BD"] as const;

export default async function DashboardPage() {
  try { await requireWorkspaceUser(ALL); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/dashboard" : "/login?error=forbidden"); }
  return <Dashboard />;
}
