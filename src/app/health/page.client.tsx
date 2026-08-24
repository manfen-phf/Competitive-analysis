"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionUser } from "@/lib/auth";
import { DataQualitySummary } from "@/components/data-center/data-quality-summary";
import { OrderDetailDrawer } from "@/components/data-center/order-detail-drawer";
import { OrdersTable, type DataCenterOrder } from "@/components/data-center/orders-table";
import { PageHeader } from "@/components/workspace/page-header";

type HealthData = { validCount: number; pendingCount: number; failedCount: number; averageConfidence: number };
type ResponseData = { items: DataCenterOrder[]; page: number; totalPages: number; total: number };
type Filters = { q: string; city: string; bd: string; merchant: string; platform: string; recognitionStatus: string; start: string; end: string };
const emptyFilters: Filters = { q: "", city: "", bd: "", merchant: "", platform: "", recognitionStatus: "", start: "", end: "" };
const queryString = (filters: Filters, page: number) => { const params = new URLSearchParams({ page: String(page), pageSize: "20" }); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); }); return params.toString(); };

export default function Health({ user }: { user: SessionUser }) {
  const [health, setHealth] = useState<HealthData>({ validCount: 0, pendingCount: 0, failedCount: 0, averageConfidence: 0 });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [orders, setOrders] = useState<ResponseData>({ items: [], page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canEdit = useCallback((order: DataCenterOrder) => user.role === "SUPER_ADMIN" || (user.role === "CITY_ADMIN" && user.city === order.city), [user]);
  const canExport = user.role === "SUPER_ADMIN" || (user.role === "CITY_ADMIN" && (!filters.city || filters.city === user.city));
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { const [healthResponse, orderResponse] = await Promise.all([fetch("/api/health"), fetch(`/api/orders?${queryString(filters, page)}`)]); const healthJson = await healthResponse.json(); const orderJson = await orderResponse.json(); if (!healthResponse.ok) throw new Error(healthJson.error ?? "无法读取数据质量"); if (!orderResponse.ok) throw new Error(orderJson.error ?? "无法读取订单数据"); setHealth(healthJson); setOrders(orderJson); } catch (reason) { setError(reason instanceof Error ? reason.message : "数据中心暂时不可用"); } finally { setLoading(false); } }, [filters, page]);
  useEffect(() => { void refresh(); }, [refresh]);
  const update = (key: keyof Filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };
  const exportCurrent = () => { if (canExport) window.location.assign(`/api/orders/export?${queryString(filters, 1)}`); };
  return <main className="data-center-page"><PageHeader eyebrow="Governed data" title="数据中心" description="查、核、改、导出：识别结果与原始截图始终保留在受控权限范围内。" backHref="/" actions={<button type="button" className="data-secondary" disabled={!canExport} title={canExport ? "导出当前筛选结果" : "城市管理员只能导出所属城市数据"} onClick={exportCurrent}>导出 Excel</button>} />
    <DataQualitySummary data={health} />
    <section className="data-filter-dock" aria-label="订单筛选"><div className="data-filter-heading"><div><p>订单明细</p><h2>最新采集优先</h2></div><span>{orders.total} 条结果</span></div><div className="data-filter-grid"><label>搜索<input value={filters.q} placeholder="商家、ID、BD 或城市" onChange={(event) => update("q", event.target.value)} /></label><label>开始日期<input type="date" value={filters.start} onChange={(event) => update("start", event.target.value)} /></label><label>结束日期<input type="date" value={filters.end} onChange={(event) => update("end", event.target.value)} /></label><label>城市<input value={filters.city} placeholder="全部城市" onChange={(event) => update("city", event.target.value)} /></label><label>BD<input value={filters.bd} placeholder="全部 BD" onChange={(event) => update("bd", event.target.value)} /></label><label>商家 ID<input value={filters.merchant} placeholder="全部商家" onChange={(event) => update("merchant", event.target.value)} /></label><label>平台<select value={filters.platform} onChange={(event) => update("platform", event.target.value)}><option value="">全部平台</option><option value="MEITUAN">美团</option><option value="B_JIA">B家</option></select></label><label>识别状态<select value={filters.recognitionStatus} onChange={(event) => update("recognitionStatus", event.target.value)}><option value="">全部状态</option><option value="SUCCEEDED">已识别</option><option value="PENDING">待识别</option><option value="FAILED">识别失败</option></select></label></div><button className="data-filter-reset" type="button" onClick={() => { setFilters(emptyFilters); setPage(1); }}>清除筛选</button></section>
    {error ? <div className="workspace-data-state" data-state="error"><span className="workspace-data-state-icon" /><div><h2>数据加载失败</h2><p>{error}</p></div></div> : <section className="data-orders-panel"><OrdersTable orders={orders.items} loading={loading} canEdit={canEdit} onOpen={(order) => setSelectedId(order.id)} />{orders.totalPages > 1 ? <nav className="data-pagination" aria-label="订单分页"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>上一页</button><span>第 {page} / {orders.totalPages} 页</span><button type="button" disabled={page >= orders.totalPages} onClick={() => setPage((current) => current + 1)}>下一页</button></nav> : null}</section>}
    <OrderDetailDrawer orderId={selectedId} canEdit={Boolean(selectedId && orders.items.find((order) => order.id === selectedId && canEdit(order)))} onClose={() => setSelectedId(null)} onSaved={() => void refresh()} />
  </main>;
}
