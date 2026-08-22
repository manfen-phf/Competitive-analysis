"use client";

import { useEffect, useMemo, useState } from "react";

import { ComparisonMatrix } from "@/components/analytics/comparison-matrix";
import { FilterDock, type FilterValue, type MerchantOption } from "@/components/analytics/filter-dock";
import { MerchantRanking } from "@/components/analytics/merchant-ranking";
import { MetricCard } from "@/components/analytics/metric-card";
import { TrendChart } from "@/components/analytics/trend-chart";
import { DataState } from "@/components/workspace/data-state";
import { PageHeader } from "@/components/workspace/page-header";
import { metricLabels, type AnalyticsSnapshot, type MetricKey } from "@/lib/analytics";
import type { SessionUser } from "@/lib/auth";

type Row = AnalyticsSnapshot["comparison"][number];
type DashboardData = AnalyticsSnapshot & { demo: boolean; realOrderCount: number };
type LoadState = "loading" | "ready" | "error";

const empty: DashboardData = {
  totalOrders: 0,
  demo: false,
  realOrderCount: 0,
  platforms: { MEITUAN: { validOrderCount: 0 } as DashboardData["platforms"]["MEITUAN"], B_JIA: { validOrderCount: 0 } as DashboardData["platforms"]["B_JIA"] },
  comparison: [], trend: [], merchantRanking: [], filteredCities: [], filteredBds: [], filteredMerchants: [],
};

const displayNumber = (value: number, unit: Row["unit"]) => unit === "percent" ? `${(value * 100).toFixed(1)}%` : `¥${Number(value || 0).toFixed(2)}`;
const periodLabels = { DAY: "按日", WEEK: "按自然周", MONTH: "按月", YEAR: "按年" } as const;

export default function Dashboard({ user }: { user: SessionUser }) {
  const [cities, setCities] = useState<string[]>([]);
  const [bds, setBds] = useState<string[]>([]);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [merchantQuery, setMerchantQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>({ period: "DAY", metric: "userPaidAmount", city: user.role === "BD" ? user.city ?? undefined : undefined, bd: user.role === "BD" ? user.bdName ?? undefined : undefined });
  const [data, setData] = useState<DashboardData>(empty);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    fetch("/api/filter-options?demo=1").then((response) => response.ok ? response.json() : { values: [] }).then((payload) => setCities(payload.values ?? [])).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!filter.city) { setBds([]); return; }
    fetch(`/api/filter-options?demo=1&city=${encodeURIComponent(filter.city)}`).then((response) => response.ok ? response.json() : { values: [] }).then((payload) => setBds(payload.values ?? [])).catch(() => setBds([]));
  }, [filter.city]);

  useEffect(() => {
    if (!filter.city) { setMerchants([]); return; }
    fetch(`/api/merchants?demo=1&city=${encodeURIComponent(filter.city)}&query=${encodeURIComponent(merchantQuery)}`).then((response) => response.ok ? response.json() : { merchants: [] }).then((payload) => setMerchants(payload.merchants ?? [])).catch(() => setMerchants([]));
  }, [filter.city, merchantQuery]);

  const search = useMemo(() => new URLSearchParams({
    demo: "1", period: filter.period, metric: filter.metric,
    ...(filter.city ? { city: filter.city } : {}), ...(filter.bd ? { bd: filter.bd } : {}), ...(filter.merchantId ? { merchantId: filter.merchantId } : {}), ...(filter.start ? { start: filter.start } : {}), ...(filter.end ? { end: filter.end } : {}),
  }), [filter]);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    fetch(`/api/analytics?${search}`).then(async (response) => {
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "数据加载失败");
      return response.json() as Promise<DashboardData>;
    }).then((payload) => { if (active) { setData(payload); setLoadState("ready"); } }).catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [search]);

  const selected = data.comparison.find((row) => row.key === filter.metric);
  const reset = () => setFilter({ period: "DAY", metric: "userPaidAmount", city: user.role === "BD" ? user.city ?? undefined : undefined, bd: user.role === "BD" ? user.bdName ?? undefined : undefined });
  const differenceOutcome = selected && selected.difference === 0 ? "neutral" : selected && selected.difference > 0 ? "good" : "risk";

  return <main className="analytics-page" id="workspace-content">
    <PageHeader eyebrow="竞争价格力 / Analytics" title="竞争价格力分析" description="从已确认的双平台采集数据中，快速定位平台差异与待跟进商家。" backHref="/" actions={<><span className="analytics-data-badge">{data.demo ? "演示数据预览" : "正式数据"}</span><button type="button" className="analytics-reset" onClick={reset}>重置筛选</button></>} />
    <FilterDock value={filter} cities={cities} bds={bds} merchants={merchants} onChange={setFilter} onMerchantQueryChange={setMerchantQuery} lockedCity={user.role === "BD" ? user.city ?? undefined : undefined} lockedBd={user.role === "BD" ? user.bdName ?? undefined : undefined} />
    {loadState === "loading" ? <DataState state="loading" title="正在汇总竞争数据" /> : null}
    {loadState === "error" ? <DataState state="error" title="分析数据暂时无法加载" description="已保留当前筛选条件，可稍后重新尝试。" action={<button type="button" className="analytics-reset" onClick={() => setFilter({ ...filter })}>重新加载</button>} /> : null}
    {loadState === "ready" ? <>
      <section className="analytics-kpi-grid" aria-label="当前分析结论">
        <MetricCard label="有效订单" value={String(data.totalOrders)} description="当前筛选内的双平台订单" />
        <MetricCard label={`美团 · ${metricLabels[filter.metric]}`} value={selected ? displayNumber(selected.meituan, selected.unit) : "—"} description={`${data.platforms.MEITUAN.validOrderCount} 条平均`} tone="meituan" metric={filter.metric} />
        <MetricCard label={`B家 · ${metricLabels[filter.metric]}`} value={selected ? displayNumber(selected.bJia, selected.unit) : "—"} description={`${data.platforms.B_JIA.validOrderCount} 条平均`} tone="bjia" metric={filter.metric} />
        <MetricCard label="平台差异" value={selected ? `${selected.difference > 0 ? "+" : ""}${displayNumber(selected.difference, selected.unit)}` : "—"} description="美团 − B家；正负仅表示数值差异" tone="outcome" outcome={differenceOutcome} />
      </section>
      <section className="analytics-content-grid">
        <TrendChart title={metricLabels[filter.metric]} periodLabel={periodLabels[filter.period]} data={data.trend} format={(value) => displayNumber(value, selected?.unit ?? "money")} />
        <ComparisonMatrix rows={data.comparison} activeMetric={filter.metric} onSelect={(metric) => setFilter({ ...filter, metric })} format={displayNumber} />
      </section>
      <MerchantRanking rows={data.merchantRanking} metricLabel={metricLabels[filter.metric]} format={displayNumber} />
    </> : null}
  </main>;
}
