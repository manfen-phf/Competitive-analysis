import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { redirect } from "next/navigation";

import AccountManagementPage from "./page.client";

export default async function AdminUsersPage() {
  try {
    await requireWorkspaceUser(["SUPER_ADMIN"]);
  } catch (error) {
    redirect(error instanceof AuthenticationRequiredError ? "/login?next=/admin/users" : "/login?error=forbidden");
  }
  return <AccountManagementPage />;
}
