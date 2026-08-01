import type { ReactNode } from "react";

export interface WorkspaceShellProps {
  children: ReactNode;
  contextLabel: string;
  rightPanel?: ReactNode;
}

export function WorkspaceShell({ children, contextLabel, rightPanel }: WorkspaceShellProps) {
  const hasRightPanel = rightPanel !== undefined;

  return (
    <div
      className="workspace-shell"
      data-rail="expanded"
      data-right-panel={hasRightPanel}
      data-theme="dark"
    >
      <a className="workspace-skip-link" href="#workspace-main">
        跳至主要内容
      </a>
      <aside className="workspace-rail" aria-label="工作区侧栏">
        <span className="workspace-rail-mark" aria-label="运营工作区">
          运营
        </span>
      </aside>
      <div className="workspace-content">
        <header className="workspace-context">
          <p>{contextLabel}</p>
        </header>
        <div className="workspace-main" id="workspace-main" tabIndex={-1}>
          {children}
        </div>
      </div>
      {hasRightPanel ? (
        <aside className="workspace-panel" aria-label="AI 协作面板">
          {rightPanel}
        </aside>
      ) : null}
    </div>
  );
}
