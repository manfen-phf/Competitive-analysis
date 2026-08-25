"use client";

import { useCallback, useEffect, useState } from "react";

import { AttentionList } from "@/components/overview/attention-list";
import { OverviewSummary } from "@/components/overview/overview-summary";
import { RecentCollectionList } from "@/components/overview/recent-collection-list";
import { DataState } from "@/components/workspace/data-state";
import { PageHeader } from "@/components/workspace/page-header";
import type { OverviewSnapshot } from "@/lib/overview";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: OverviewSnapshot };

export default function OverviewClient() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/overview");
      const data = await response.json() as OverviewSnapshot & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "无法读取概览数据");
      setState({ kind: "ready", data });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "概览数据暂时不可用" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <main className="overview-page" id="workspace-content">
    <PageHeader eyebrow="Today / Workspace" title="今日采集概览" description="先完成一组双平台订单采集，再进入确认和价格力分析。" actions={<button type="button" className="overview-refresh" onClick={() => void load()} disabled={state.kind === "loading"}>{state.kind === "loading" ? "正在刷新" : "刷新数据"}</button>} />
    {state.kind === "loading" ? <DataState state="loading" title="正在汇总今天的采集进度" /> : null}
    {state.kind === "error" ? <DataState state="error" title="概览数据暂时无法加载" description={state.message} action={<button type="button" className="overview-refresh" onClick={() => void load()}>重新加载</button>} /> : null}
    {state.kind === "ready" ? <><OverviewSummary snapshot={state.data} /><section className="overview-content-grid"><RecentCollectionList collections={state.data.latestCollections} /><AttentionList merchants={state.data.attentionMerchants} /></section></> : null}
  </main>;
}
