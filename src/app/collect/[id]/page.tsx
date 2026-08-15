"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Platform = "MEITUAN" | "B_JIA";
type OrderResult = {
  platform: Platform; goodsTotal: number; orderNumber: string | null; packagingFee: number | null; merchantActivityAmount: number | null;
  deliveryFeeReduction: number | null; platformRedPacketAmount: number | null; platformRedPacketMerchantShare: number | null;
  merchantSettlementAmount: number | null; technicalServiceFee: number | null; deliveryServiceFee: number | null; confidence: number | null;
  dishPrice: number; originalDeliveryFee: number; paidDeliveryFee: number | null; userPaidAmount: number | null; merchantRate: number | null;
};
type Image = { imageId: string; platform: Platform; recognitionStatus: string | null; structuredResult: OrderResult | null; failureReason: string | null };
type Collection = { collectionSessionId: string; status: string; merchantName: string; merchantCode: string; cityName: string; originalDeliveryFee: number | null; images: Image[] };

const editableFields: Array<keyof Pick<OrderResult, "orderNumber" | "goodsTotal" | "packagingFee" | "merchantActivityAmount" | "deliveryFeeReduction" | "platformRedPacketAmount" | "platformRedPacketMerchantShare" | "merchantSettlementAmount" | "technicalServiceFee" | "deliveryServiceFee">> = [
  "orderNumber", "goodsTotal", "packagingFee", "merchantActivityAmount", "deliveryFeeReduction", "platformRedPacketAmount", "platformRedPacketMerchantShare", "merchantSettlementAmount", "technicalServiceFee", "deliveryServiceFee",
];
const editableLabels: Record<(typeof editableFields)[number], string> = {
  orderNumber: "订单号", goodsTotal: "商品总价（必填）", packagingFee: "打包费 / 餐盒费", merchantActivityAmount: "商家活动款", deliveryFeeReduction: "减配送费", platformRedPacketAmount: "平台红包抵扣金额", platformRedPacketMerchantShare: "平台红包商家承担", merchantSettlementAmount: "结算金额", technicalServiceFee: "技术服务费", deliveryServiceFee: "配送服务费",
};
const calculatedFields: Array<keyof Pick<OrderResult, "dishPrice" | "originalDeliveryFee" | "paidDeliveryFee" | "userPaidAmount" | "merchantRate">> = ["dishPrice", "originalDeliveryFee", "paidDeliveryFee", "userPaidAmount", "merchantRate"];
const calculatedLabels: Record<(typeof calculatedFields)[number], string> = { dishPrice: "菜品原价（系统计算）", originalDeliveryFee: "原价配送费（BD填写）", paidDeliveryFee: "实付配送费（系统计算）", userPaidAmount: "用户实付（系统计算）", merchantRate: "实际费率（系统计算）" };

function calculate(draft: OrderResult): OrderResult {
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    ...draft,
    dishPrice: round(draft.goodsTotal - (draft.packagingFee ?? 0)),
    paidDeliveryFee: draft.deliveryFeeReduction === null ? null : round(draft.originalDeliveryFee - draft.deliveryFeeReduction),
    userPaidAmount: draft.merchantActivityAmount === null ? null : round(draft.goodsTotal + draft.originalDeliveryFee - draft.merchantActivityAmount),
    merchantRate: draft.technicalServiceFee === null || draft.deliveryServiceFee === null || draft.goodsTotal === 0 ? null : round(((draft.technicalServiceFee + draft.deliveryServiceFee) / draft.goodsTotal) * 100),
  };
}

async function json(response: Response) { const value = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof value.error === "string" ? value.error : "请求失败，请稍后重试"); return value; }

export default function CollectionRecognitionPage() {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [drafts, setDrafts] = useState<Record<Platform, OrderResult | null>>({ MEITUAN: null, B_JIA: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ tone: "info", text: "正在读取采集任务…" });
  const load = useCallback(async () => {
    try {
      const value = await json(await fetch(`/api/collections/${id}`)) as Collection;
      setCollection(value);
      setDrafts({ MEITUAN: value.images.find((item) => item.platform === "MEITUAN")?.structuredResult ?? null, B_JIA: value.images.find((item) => item.platform === "B_JIA")?.structuredResult ?? null });
      setNotice({ tone: "info", text: value.status === "UPLOADED" ? "原图已保存。请开始 AI 识别。" : "请核对识别结果；未识别字段可保持为空。" });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "读取采集任务失败" }); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const recognize = async () => { if (busy) return; setBusy(true); setNotice({ tone: "info", text: "千问正在识别美团与 B家订单长图…" }); try { const value = await json(await fetch(`/api/collections/${id}/recognize`, { method: "POST" })); setNotice({ tone: value.status === "RECOGNIZED" ? "success" : "error", text: value.status === "RECOGNIZED" ? "识别完成，请核对后确认。" : "未识别到商品总价，请更换更完整的订单截图。" }); await load(); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "识别任务失败" }); } finally { setBusy(false); } };
  const update = (platform: Platform, field: (typeof editableFields)[number], value: string) => setDrafts((current) => {
    const draft = current[platform]; if (!draft) return current;
    const next = field === "orderNumber" ? (value.trim() || null) : (value === "" ? null : Number(value));
    return { ...current, [platform]: calculate({ ...draft, [field]: next } as OrderResult) };
  });
  const confirm = async () => { if (!drafts.MEITUAN || !drafts.B_JIA || busy) return; setBusy(true); setNotice({ tone: "info", text: "正在正式保存两平台订单数据…" }); try { await json(await fetch(`/api/collections/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ results: [drafts.MEITUAN, drafts.B_JIA] }) })); setNotice({ tone: "success", text: "已确认并正式保存。" }); await load(); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "确认保存失败" }); } finally { setBusy(false); } };

  return <main className="collection-page recognition-page"><header className="collection-heading"><div><p>订单识别与确认</p><h1>核对后，才进入正式数据</h1><span>商品总价是唯一必填字段；没有展示的费用请留空，系统会自动计算派生指标。</span></div><span className="collection-stage">P0-3 · AI 识别</span></header>{collection ? <section className="collection-card recognition-actions"><div><p className="eyebrow">采集商家</p><h2>{collection.merchantName}</h2><span>{collection.cityName} · {collection.merchantCode} · 原价配送费 {collection.originalDeliveryFee ?? "未填写"} 元</span></div><button className="primary" disabled={busy || collection.status === "CONFIRMED"} onClick={recognize}>{busy ? "正在识别…" : "开始 AI 识别"}</button></section> : null}<section className="recognition-result-grid">{(["MEITUAN", "B_JIA"] as Platform[]).map((platform) => <ResultCard key={platform} platform={platform} draft={drafts[platform]} image={collection?.images.find((item) => item.platform === platform)} update={update} />)}</section><section className="collection-card confirmation-bar"><div><p className="eyebrow">人工确认</p><h2>识别结果无误后，正式保存</h2><span>保存时会由系统重新计算菜品原价、用户实付、实付配送费和实际费率。</span></div><button className="primary" disabled={busy || !drafts.MEITUAN || !drafts.B_JIA || collection?.status === "CONFIRMED"} onClick={confirm}>{busy ? "正在保存…" : collection?.status === "CONFIRMED" ? "已正式保存" : "确认并正式保存"}</button></section><p className={`collection-notice ${notice.tone}`}>{notice.text}</p></main>;
}

function formatValue(field: (typeof calculatedFields)[number], value: number | null) { if (value === null) return "未识别"; return field === "merchantRate" ? `${value.toFixed(2)}%` : value.toFixed(2); }

function ResultCard({ platform, draft, image, update }: { platform: Platform; draft: OrderResult | null; image: Image | undefined; update: (platform: Platform, field: (typeof editableFields)[number], value: string) => void }) {
  const title = platform === "MEITUAN" ? "美团订单" : "B家订单";
  return <section className="collection-card recognition-result-card"><div className="collection-card-heading"><div><p className="eyebrow">{platform === "MEITUAN" ? "美团" : "B家"}</p><h2>{title}</h2></div><span>{image?.recognitionStatus === "SUCCESS" ? "已识别" : "待识别"}</span></div>{!draft ? <div className="recognition-empty"><strong>{image?.failureReason ? "识别未通过" : "等待识别"}</strong><span>{image?.failureReason ?? "开始 AI 识别后将在这里显示字段。"}</span></div> : <div className="recognition-fields">{editableFields.map((field) => <label key={field}>{editableLabels[field]}<input aria-label={`${title}${editableLabels[field]}`} type={field === "orderNumber" ? "text" : "number"} step="0.01" value={draft[field] ?? ""} onChange={(event) => update(platform, field, event.target.value)} /></label>)}<div className="calculated-fields">{calculatedFields.map((field) => <p key={field}><span>{calculatedLabels[field]}</span><strong>{formatValue(field, draft[field])}</strong></p>)}</div><p className="recognition-confidence">AI 置信度：{draft.confidence === null ? "未提供" : `${Math.round(draft.confidence * 100)}%`}</p></div>}</section>;
}
