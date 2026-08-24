"use client";

import { useEffect, useMemo, useState } from "react";

import type { DataCenterOrder } from "./orders-table";

type DetailOrder = DataCenterOrder & {
  packagingFee: number; merchantActivity: number; otherPromotion: number; originalDeliveryFee: number; deliveryFeeReduction: number;
  paidDeliveryFee: number; platformRedPacket: number; platformRedPacketMerchantShare: number; technicalServiceFee: number; deliveryServiceFee: number;
  dishPrice: number; imageUrl: string; audits: Array<{ id: string; actorUsername: string; createdAt: string }>;
};
type FormValues = Record<string, number>;
const editableFields: Array<[keyof DetailOrder, string]> = [["goodsTotal", "商品总价"], ["packagingFee", "打包费"], ["merchantActivity", "商家活动款"], ["otherPromotion", "其他活动"], ["originalDeliveryFee", "原价配送费"], ["deliveryFeeReduction", "减配送费"], ["platformRedPacket", "平台红包抵扣金额"], ["platformRedPacketMerchantShare", "平台红包商家承担"], ["merchantSettlementAmount", "结算金额"], ["technicalServiceFee", "技术服务费"], ["deliveryServiceFee", "配送服务费"]];
const money = (value: number) => `¥${Number(value ?? 0).toFixed(2)}`;

function initialValues(order: DetailOrder): FormValues {
  return Object.fromEntries(editableFields.map(([key]) => [key, order[key] as number]));
}

export function OrderDetailDrawer({ orderId, canEdit, onClose, onSaved }: { orderId: string | null; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const [order, setOrder] = useState<DetailOrder | null>(null);
  const [form, setForm] = useState<FormValues>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!orderId) { setOrder(null); return; } setLoading(true); setNotice(""); fetch(`/api/orders/${orderId}`).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => { if (!response.ok) throw new Error(body.error ?? "无法读取订单"); setOrder(body.item); setForm(initialValues(body.item)); }).catch((error: Error) => setNotice(error.message)).finally(() => setLoading(false)); }, [orderId]);
  const calculated = useMemo(() => { const goods = form.goodsTotal ?? 0, box = form.packagingFee ?? 0, activity = form.merchantActivity ?? 0, original = form.originalDeliveryFee ?? 0, reduction = form.deliveryFeeReduction ?? 0; return { dish: goods - box, delivery: Math.max(original - reduction, 0), paid: goods - box + original - activity, rate: goods ? ((form.technicalServiceFee ?? 0) + (form.deliveryServiceFee ?? 0)) / goods : 0 }; }, [form]);
  if (!orderId) return null;
  const save = async () => { if (!order || !canEdit) return; setLoading(true); setNotice(""); try { const response = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "保存失败"); setOrder((current) => current ? { ...current, ...body.item } : current); setForm(initialValues(body.item)); setNotice("已保存修正，并写入操作记录。"); onSaved(); } catch (error) { setNotice(error instanceof Error ? error.message : "保存失败"); } finally { setLoading(false); } };
  return <div className="data-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="data-order-drawer" role="dialog" aria-modal="true" aria-label="订单数据详情"><header><div><p>订单数据详情</p><h2>{order?.merchantName ?? "正在载入"}</h2></div><button type="button" onClick={onClose} aria-label="关闭详情">×</button></header>{loading && !order ? <p className="data-drawer-loading">正在读取订单详情…</p> : null}{notice ? <p className="data-drawer-notice">{notice}</p> : null}{order ? <div className="data-drawer-body"><section className="data-original-image"><div><p>受保护的原始截图</p><small>仅已授权管理员可通过私有链接查看，不可公开访问。</small></div><img src={order.imageUrl} alt={`${order.merchantName} 原始订单截图`} /></section><section><h3>识别与校对字段</h3><div className="data-edit-grid">{editableFields.map(([key, label]) => <label key={key}>{label}<input type="number" min={key === "merchantSettlementAmount" ? undefined : "0"} step="0.01" disabled={!canEdit || loading} value={form[key] ?? 0} onChange={(event) => setForm((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div></section><section className="data-derived-grid"><h3>系统计算（只读）</h3><dl><div><dt>菜品原价</dt><dd>{money(calculated.dish)}</dd></div><div><dt>实付配送费</dt><dd>{money(calculated.delivery)}</dd></div><div><dt>用户实付</dt><dd>{money(calculated.paid)}</dd></div><div><dt>实际费率</dt><dd>{(calculated.rate * 100).toFixed(2)}%</dd></div></dl></section><section className="data-audit"><h3>数据质量与操作记录</h3><p>当前订单状态：<b>{order.upload.recognitionStatus === "SUCCEEDED" ? "已识别并确认" : order.upload.recognitionStatus}</b></p>{order.audits.length ? <ul>{order.audits.map((audit) => <li key={audit.id}>{audit.actorUsername} 于 {new Date(audit.createdAt).toLocaleString("zh-CN", { hour12: false })} 修正了订单字段</li>)}</ul> : <p>暂无人工修正记录，保留首次确认数据。</p>}</section>{canEdit ? <button type="button" className="data-primary" disabled={loading} onClick={save}>{loading ? "保存中…" : "保存修正"}</button> : <p className="data-readonly-notice">你可查看全部城市数据，但仅能修改所属城市订单。</p>}</div> : null}</aside></div>;
}
