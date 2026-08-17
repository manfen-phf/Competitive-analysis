"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type WorkspaceRailProps = { expanded: boolean; onToggle: () => void; onCommand: () => void };
type RailIconName = "home" | "collect" | "analysis" | "records" | "import" | "search" | "panel";
type NavItem = { href: string; label: string; icon: RailIconName };

const navItems: NavItem[] = [
  { href: "/", label: "\u6982\u89c8", icon: "home" },
  { href: "/collect", label: "\u91c7\u96c6", icon: "collect" },
  { href: "/dashboard", label: "\u5206\u6790", icon: "analysis" },
  { href: "/records", label: "\u6570\u636e", icon: "records" },
  { href: "/admin/import", label: "\u4e3b\u6570\u636e", icon: "import" },
];

export function WorkspaceRail({ expanded, onToggle, onCommand }: WorkspaceRailProps) {
  return <aside className="workspace-rail" aria-label={"\u5de5\u4f5c\u533a\u5bfc\u822a"}>
    <div className="workspace-rail-top">
      <Link className="workspace-rail-mark" href="/" aria-label={"\u8fd4\u56de\u6982\u89c8"}>
        <span aria-hidden="true">{"\u8fd0"}</span>{expanded ? <strong>COLLECT</strong> : null}
      </Link>
      <button className="workspace-rail-toggle" type="button" onClick={onToggle} aria-label={expanded ? "\u6298\u53e0\u5bfc\u822a" : "\u5c55\u5f00\u5bfc\u822a"}><RailIcon name="panel" /></button>
    </div>
    <button className="workspace-rail-command" type="button" onClick={onCommand}><RailIcon name="search" />{expanded ? <span>{"\u641c\u7d22\u6216\u6253\u5f00\u9875\u9762"}</span> : null}{expanded ? <kbd>Ctrl K</kbd> : null}</button>
    <nav className="workspace-rail-nav" aria-label={"\u4e3b\u8981\u5bfc\u822a"}>
      {navItems.map((item) => <Link className="workspace-rail-link" href={item.href} key={item.href} title={item.label}><RailIcon name={item.icon} />{expanded ? <span>{item.label}</span> : null}</Link>)}
    </nav>
  </aside>;
}

function RailIcon({ name }: { name: RailIconName }) {
  const paths: Record<RailIconName, ReactNode> = {
    home: <><path d="m3 10.5 9-7 9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></>,
    collect: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /><path d="M5 17v3h14v-3" /></>,
    analysis: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
    records: <><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    import: <><path d="M5 20h14V8l-4-4H5z" /><path d="M15 4v4h4" /><path d="M12 10v6M9.5 13.5 12 16l2.5-2.5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
    panel: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M10 4v16" /></>,
  };
  return <svg className="workspace-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>;
}
