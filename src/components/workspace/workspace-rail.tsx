"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { SessionUser } from "@/lib/auth";
import { navItemsFor, type WorkspaceIconName } from "./navigation";

export { navItemsFor, type WorkspaceIconName, type WorkspaceNavItem } from "./navigation";

type WorkspaceRailProps = {
  user: SessionUser;
  expanded: boolean;
  onToggle: () => void;
  onCommand: () => void;
};

export function WorkspaceRail({ user, expanded, onToggle, onCommand }: WorkspaceRailProps) {
  const pathname = usePathname();
  const navigation = navItemsFor(user);

  return <aside className="workspace-rail" aria-label="工作台导航">
    <div className="workspace-rail-top">
      <Link className="workspace-rail-mark" href="/" aria-label="返回概览">
        <span aria-hidden="true">商</span>
        {expanded ? <strong>COMPETITION</strong> : null}
      </Link>
      <button className="workspace-rail-toggle" type="button" onClick={onToggle} aria-label={expanded ? "折叠导航" : "展开导航"}>
        <WorkspaceIcon name="panel" />
      </button>
    </div>
    <button className="workspace-rail-command workspace-control" type="button" onClick={onCommand} aria-label="搜索与命令">
      <WorkspaceIcon name="search" />
      {expanded ? <span>搜索与命令</span> : null}
      {expanded ? <kbd>⌘K</kbd> : null}
    </button>
    <nav className="workspace-rail-nav" aria-label="主要导航">
      {navigation.map((item) => <Link className="workspace-rail-link" data-active={pathname === item.href} href={item.href} key={item.href} title={item.label} aria-current={pathname === item.href ? "page" : undefined}>
        <WorkspaceIcon name={item.icon} />
        {expanded ? <span>{item.label}</span> : null}
      </Link>)}
    </nav>
    <div className="workspace-rail-bottom">
      {expanded ? <div className="workspace-user-summary"><span>{user.username}</span><small>{user.role === "SUPER_ADMIN" ? "超级管理员" : user.role === "CITY_ADMIN" ? `${user.city ?? ""}城市管理员` : `${user.bdName ?? user.username} · BD`}</small></div> : null}
    </div>
  </aside>;
}

export function WorkspaceIcon({ name }: { name: WorkspaceIconName }) {
  const paths: Record<WorkspaceIconName, ReactNode> = {
    overview: <><path d="m3 10.5 9-7 9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></>,
    collection: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M8 5V3h8v2M3 10h18M9 14h6" /></>,
    analysis: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    data: <><path d="M4 10h16v10H4zM3 6h18l-2 4H5zM8 20v-6h4v6" /></>,
    "master-data": <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.7-3.4 3.2-5.5 7.5-5.5s6.8 2.1 7.5 5.5" /></>,
    account: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.7-3.4 3.2-5.5 7.5-5.5s6.8 2.1 7.5 5.5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
    panel: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M10 4v16" /></>,
  };
  return <svg className="workspace-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>;
}
