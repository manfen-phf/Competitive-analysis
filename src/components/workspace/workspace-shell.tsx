"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { SessionUser } from "@/lib/auth";
import { CommandPalette } from "./command-palette";
import { MobileNavigation } from "./mobile-navigation";
import { WorkspaceRail } from "./workspace-rail";

export interface WorkspaceShellProps {
  children: ReactNode;
  contextLabel: string;
  user: SessionUser | null;
  rightPanel?: ReactNode;
}

export function WorkspaceShell({ children, contextLabel, user, rightPanel }: WorkspaceShellProps) {
  const [railExpanded, setRailExpanded] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const hasRightPanel = rightPanel !== undefined;
  const closeCommand = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!user) return <div className="workspace-anonymous" data-theme="dark">{children}</div>;

  return <div className="workspace-shell" data-rail={railExpanded ? "expanded" : "collapsed"} data-right-panel={hasRightPanel} data-theme="dark">
    <a className="workspace-skip-link" href="#workspace-main">跳至主要内容</a>
    <WorkspaceRail user={user} expanded={railExpanded} onCommand={() => setCommandOpen(true)} onToggle={() => setRailExpanded((expanded) => !expanded)} />
    <div className="workspace-content">
      <header className="workspace-context">
        <p>{contextLabel}</p>
        <button className="workspace-command-trigger workspace-control" type="button" onClick={() => setCommandOpen(true)}><span>搜索或执行操作</span><kbd>⌘ K</kbd></button>
      </header>
      <div className="workspace-main" id="workspace-main" tabIndex={-1}>{children}</div>
    </div>
    {hasRightPanel ? <aside className="workspace-panel" aria-label="协作面板">{rightPanel}</aside> : null}
    <MobileNavigation user={user} />
    <CommandPalette user={user} open={commandOpen} onClose={closeCommand} />
  </div>;
}
