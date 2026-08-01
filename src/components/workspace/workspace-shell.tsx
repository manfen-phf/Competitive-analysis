"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "./command-palette";
import { WorkspaceRail } from "./workspace-rail";

export interface WorkspaceShellProps { children: ReactNode; contextLabel: string; rightPanel?: ReactNode; }

export function WorkspaceShell({ children, contextLabel, rightPanel }: WorkspaceShellProps) {
  const [railExpanded, setRailExpanded] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const hasRightPanel = rightPanel !== undefined;
  const closeCommand = useCallback(() => setCommandOpen(false), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((open) => !open); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return <div className="workspace-shell" data-rail={railExpanded ? "expanded" : "collapsed"} data-right-panel={hasRightPanel} data-theme="dark">
    <a className="workspace-skip-link" href="#workspace-main">{"\u8df3\u81f3\u4e3b\u8981\u5185\u5bb9"}</a>
    <WorkspaceRail expanded={railExpanded} onCommand={() => setCommandOpen(true)} onToggle={() => setRailExpanded((expanded) => !expanded)} />
    <div className="workspace-content"><header className="workspace-context"><p>{contextLabel}</p><button className="workspace-command-trigger" type="button" onClick={() => setCommandOpen(true)}><span>{"\u641c\u7d22\u6216\u6267\u884c\u64cd\u4f5c"}</span><kbd>⌘ K</kbd></button></header><div className="workspace-main" id="workspace-main" tabIndex={-1}>{children}</div></div>
    {hasRightPanel ? <aside className="workspace-panel" aria-label={"AI \u534f\u4f5c\u9762\u677f"}>{rightPanel}</aside> : null}
    <CommandPalette open={commandOpen} onClose={closeCommand} />
  </div>;
}