import Link from "next/link";
import type { ReactNode } from "react";

export type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, backHref, actions }: PageHeaderProps) {
  return <header className="workspace-page-header">
    <div>
      {backHref ? <Link className="workspace-back-link" href={backHref}>返回概览</Link> : null}
      {eyebrow ? <p className="workspace-page-eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p className="workspace-page-description">{description}</p> : null}
    </div>
    {actions ? <div className="workspace-page-actions">{actions}</div> : null}
  </header>;
}
