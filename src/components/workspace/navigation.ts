import type { SessionUser } from "@/lib/auth";

export type WorkspaceIconName = "overview" | "collection" | "analysis" | "data" | "master-data" | "account" | "search" | "panel";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: Exclude<WorkspaceIconName, "search" | "panel">;
};

const allNavItems: WorkspaceNavItem[] = [
  { href: "/", label: "概览", icon: "overview" },
  { href: "/upload", label: "采集", icon: "collection" },
  { href: "/dashboard", label: "分析", icon: "analysis" },
  { href: "/health", label: "数据中心", icon: "data" },
  { href: "/admin/import", label: "主数据", icon: "master-data" },
  { href: "/admin/users", label: "账号", icon: "account" },
];

export function navItemsFor(user: Pick<SessionUser, "role">): WorkspaceNavItem[] {
  if (user.role === "SUPER_ADMIN") return allNavItems;
  if (user.role === "CITY_ADMIN") return allNavItems.slice(0, 4);
  return allNavItems.slice(0, 3);
}
