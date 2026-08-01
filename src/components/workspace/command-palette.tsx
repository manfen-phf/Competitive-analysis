"use client";
import { useEffect, useRef } from "react";
const actions = [
  { href: "/", label: "\u67e5\u770b\u4eca\u65e5\u8fd0\u8425", detail: "\u56de\u5230\u4eca\u65e5\u7684\u8fd0\u8425\u5065\u5eb7\u5ea6\u4e0e\u91cd\u70b9\u884c\u52a8" },
  { href: "/upload", label: "\u4e0a\u4f20\u8ba2\u5355\u622a\u56fe", detail: "\u5f00\u59cb\u4e00\u5f20\u5546\u5bb6\u8ba2\u5355\u7684\u8bc6\u522b\u4e0e\u6821\u9a8c" },
  { href: "/dashboard", label: "\u6253\u5f00\u7ade\u4e89\u6d1e\u5bdf", detail: "\u6309\u57ce\u5e02\u3001\u5546\u5bb6\u6216 BD \u67e5\u770b\u4ef7\u683c\u529b\u53d8\u5316" },
  { href: "/admin/import", label: "\u5bfc\u5165\u5546\u5bb6\u6570\u636e\u6e90", detail: "\u66f4\u65b0\u5546\u5bb6\u3001\u5546\u5bb6 ID \u4e0e\u5408\u4f5c BD \u5bf9\u7167\u6570\u636e" },
];
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => inputRef.current?.focus(), 0); const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKeyDown); return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKeyDown); }; }, [open, onClose]);
  if (!open) return null;
  return <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}><section className="command-palette" role="dialog" aria-modal="true" aria-label={"\u641c\u7d22\u4e0e\u6267\u884c\u64cd\u4f5c"} onMouseDown={(event) => event.stopPropagation()}><div className="command-palette-input-wrap"><span aria-hidden="true">⌕</span><input ref={inputRef} placeholder={"\u641c\u7d22\u5de5\u4f5c\u533a\u3001\u5546\u5bb6\u6216\u64cd\u4f5c"} aria-label={"\u641c\u7d22\u5de5\u4f5c\u533a\u3001\u5546\u5bb6\u6216\u64cd\u4f5c"} /><kbd>Esc</kbd></div><p>{"\u5efa\u8bae\u64cd\u4f5c"}</p><div className="command-palette-actions">{actions.map((action) => <a href={action.href} key={action.href} onClick={onClose}><span>{action.label}</span><small>{action.detail}</small></a>)}</div></section></div>;
}