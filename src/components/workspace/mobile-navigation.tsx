"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SessionUser } from "@/lib/auth";
import { navItemsFor, WorkspaceIcon } from "./workspace-rail";

export function MobileNavigation({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  return <nav className="workspace-mobile-navigation" aria-label="移动端主要导航">
    {navItemsFor(user).map((item) => <Link key={item.href} href={item.href} data-active={pathname === item.href} aria-current={pathname === item.href ? "page" : undefined}>
      <WorkspaceIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>)}
  </nav>;
}
