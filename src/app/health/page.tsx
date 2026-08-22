import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Health from "./page.client";

const DATA = ["SUPER_ADMIN", "CITY_ADMIN"] as const;

export default async function HealthPage() {
  try { await requireWorkspaceUser(DATA); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/health" : "/login?error=forbidden"); }
  return <Health />;
}
