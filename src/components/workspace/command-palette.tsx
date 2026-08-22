"use client";
import { useEffect, useRef } from "react";

import type { SessionUser } from "@/lib/auth";
import { navItemsFor } from "./workspace-rail";

const actionDetails: Record<string, string> = {
  "/": "查看今日采集、待确认订单和异常商家",
  "/upload": "开始一笔商家订单截图采集",
  "/dashboard": "按城市、BD 或商家查看竞争差异",
  "/health": "查看、核对和导出订单数据",
  "/admin/import": "维护商家和账号主数据",
};

export function CommandPalette({ user, open, onClose }: { user: SessionUser; open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => inputRef.current?.focus(), 0); const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKeyDown); return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKeyDown); }; }, [open, onClose]);
  if (!open) return null;
  return <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}><section className="command-palette" role="dialog" aria-modal="true" aria-label="搜索与执行操作" onMouseDown={(event) => event.stopPropagation()}><div className="command-palette-input-wrap"><span aria-hidden="true">⌕</span><input ref={inputRef} placeholder="搜索工作区、商家或操作" aria-label="搜索工作区、商家或操作" /><kbd>Esc</kbd></div><p>建议操作</p><div className="command-palette-actions">{navItemsFor(user).map((action) => <a href={action.href} key={action.href} onClick={onClose}><span>前往{action.label}</span><small>{actionDetails[action.href]}</small></a>)}</div></section></div>;
}
