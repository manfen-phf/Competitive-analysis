import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Upload from "./upload.client";

const ALL = ["SUPER_ADMIN", "CITY_ADMIN", "BD"] as const;

export default async function UploadPage() {
  try { await requireWorkspaceUser(ALL); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/upload" : "/login?error=forbidden"); }
  return <Upload />;
}
