import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportPage from "./page.client";

const MASTER_DATA = ["SUPER_ADMIN"] as const;

export default async function AdminImportPage() {
  try { await requireWorkspaceUser(MASTER_DATA); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/admin/import" : "/login?error=forbidden"); }
  return <ImportPage />;
}
