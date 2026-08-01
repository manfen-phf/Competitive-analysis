"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type WorkspaceRailProps = { expanded: boolean; onToggle: () => void; onCommand: () => void; };
type NavItem = { href: string; label: string; icon: "home" | "work" | "insight" | "merchant" | "ai" | "account"; };
const navItems: NavItem[] = [
  { href: "/", label: "\u4eca\u65e5\u8fd0\u8425", icon: "home" }, { href: "/upload", label: "\u5de5\u4f5c", icon: "work" },
  { href: "/dashboard", label: "\u6d1e\u5bdf", icon: "insight" }, { href: "/dashboard", label: "\u5546\u5bb6", icon: "merchant" },
  { href: "/health", label: "AI", icon: "ai" }, { href: "/admin/import", label: "\u6211\u7684", icon: "account" },
];
const roles = [
  { value: "operator", label: "\u4e00\u7ebf\u8fd0\u8425" }, { value: "manager", label: "\u57ce\u5e02 / BD \u7ba1\u7406\u8005" }, { value: "hq", label: "\u603b\u90e8\u7ba1\u7406\u8005" },
];
export function WorkspaceRail({ expanded, onToggle, onCommand }: WorkspaceRailProps) {
  const [role, setRole] = useState("operator");
  useEffect(() => { const storedRole = window.localStorage.getItem("operations-workspace-role"); if (storedRole && roles.some((item) => item.value === storedRole)) setRole(storedRole); }, []);
  const selectRole = (nextRole: string) => { setRole(nextRole); window.localStorage.setItem("operations-workspace-role", nextRole); };
  return <aside className="workspace-rail" aria-label={"\u5de5\u4f5c\u533a\u5bfc\u822a"}>
    <div className="workspace-rail-top"><Link className="workspace-rail-mark" href="/" aria-label={"\u8fd4\u56de\u4eca\u65e5\u8fd0\u8425"}><span aria-hidden="true">{"\u8fd0"}</span>{expanded ? <strong>OPERATIONS</strong> : null}</Link><button className="workspace-rail-toggle" type="button" onClick={onToggle} aria-label={expanded ? "\u6298\u53e0\u5bfc\u822a" : "\u5c55\u5f00\u5bfc\u822a"}><RailIcon name="panel" /></button></div>
    <button className="workspace-rail-command" type="button" onClick={onCommand}><RailIcon name="search" />{expanded ? <span>{"\u641c\u7d22\u4e0e\u547d\u4ee4"}</span> : null}{expanded ? <kbd>⌘K</kbd> : null}</button>
    <nav className="workspace-rail-nav" aria-label={"\u4e3b\u8981\u5bfc\u822a"}>{navItems.map((item) => <Link className="workspace-rail-link" href={item.href} key={`${item.label}-${item.href}`} title={item.label}><RailIcon name={item.icon} />{expanded ? <span>{item.label}</span> : null}</Link>)}</nav>
    <div className="workspace-rail-bottom">{expanded ? <label className="workspace-role-preview"><span>{"\u5f53\u524d\u89c6\u89d2"}</span><select value={role} onChange={(event) => selectRole(event.target.value)} aria-label={"\u5207\u6362\u5de5\u4f5c\u89d2\u8272"}>{roles.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label> : null}<Link className="workspace-rail-link workspace-rail-account" href="/admin/import" title={"\u6211\u7684\u5de5\u4f5c\u533a"}><RailIcon name="account" />{expanded ? <span>{"\u6211\u7684\u5de5\u4f5c\u533a"}</span> : null}</Link></div>
  </aside>;
}
function RailIcon({ name }: { name: NavItem["icon"] | "search" | "panel" }) {
  const paths: Record<string, ReactNode> = { home: <><path d="m3 10.5 9-7 9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></>, work: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M8 5V3h8v2M3 10h18M9 14h6" /></>, insight: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>, merchant: <><path d="M4 10h16v10H4zM3 6h18l-2 4H5zM8 20v-6h4v6" /></>, ai: <><path d="M12 3 14 9l6 3-6 3-2 6-2-6-6-3 6-3z" /></>, account: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.7-3.4 3.2-5.5 7.5-5.5s6.8 2.1 7.5 5.5" /></>, search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>, panel: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M10 4v16" /></> };
  return <svg className="workspace-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>;
}