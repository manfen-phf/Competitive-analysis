"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SessionUser } from "@/lib/auth";
import { navItemsFor, type WorkspaceNavItem } from "./navigation";
import { WorkspaceIcon } from "./workspace-rail";

const accountItem: WorkspaceNavItem = { href: "/account", label: "我的", icon: "account" };

export function mobileNavItemsFor(user: Pick<SessionUser, "role">): WorkspaceNavItem[] {
  const desktopItems = navItemsFor(user);
  const coreItems = desktopItems.slice(0, 3);
  const dataCenter = desktopItems.find((item) => item.href === "/health");
  return dataCenter ? [...coreItems, dataCenter, accountItem] : [...coreItems, accountItem];
}

export function MobileNavigation({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  return <nav className="workspace-mobile-navigation" aria-label="移动端主要导航">
    {mobileNavItemsFor(user).map((item) => <Link key={item.href} href={item.href} data-active={pathname === item.href} aria-current={pathname === item.href ? "page" : undefined}>
      <WorkspaceIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>)}
  </nav>;
}
