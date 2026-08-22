import { AuthenticationRequiredError, requireWorkspaceUser } from "@/lib/auth";
import { PageHeader } from "@/components/workspace/page-header";
import { redirect } from "next/navigation";

const ALL = ["SUPER_ADMIN", "CITY_ADMIN", "BD"] as const;

export default async function AccountPage() {
  let user;
  try { user = await requireWorkspaceUser(ALL); } catch (error) { redirect(error instanceof AuthenticationRequiredError ? "/login?next=/account" : "/login?error=forbidden"); }
  const scope = user.role === "BD" ? `当前负责商家范围：${user.bdName ?? user.username}` : user.role === "CITY_ADMIN" ? `当前城市：${user.city ?? "未设置"}` : "可管理全量工作台数据";
  return <main><PageHeader title="我的" description="查看当前账号和工作范围。" backHref="/" /><section className="workspace-data-state" data-state="empty"><span className="workspace-data-state-icon" aria-hidden="true" /><div><h2>{user.username}</h2><p>{scope}</p></div></section></main>;
}
