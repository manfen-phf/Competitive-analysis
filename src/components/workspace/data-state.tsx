import type { ReactNode } from "react";

type DataStateProps = {
  state: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  action?: ReactNode;
};

const defaults = {
  loading: { title: "正在加载数据", description: "请稍候，数据准备完成后将自动显示。" },
  empty: { title: "暂无数据", description: "调整筛选条件或完成一笔采集后再试。" },
  error: { title: "数据暂时无法加载", description: "请保留当前筛选条件，并稍后重试。" },
};

export function DataState({ state, title, description, action }: DataStateProps) {
  const copy = defaults[state];
  return <section className="workspace-data-state" data-state={state} role={state === "error" ? "alert" : "status"} aria-live="polite">
    <span className="workspace-data-state-icon" aria-hidden="true" />
    <div><h2>{title ?? copy.title}</h2><p>{description ?? copy.description}</p>{action}</div>
  </section>;
}
