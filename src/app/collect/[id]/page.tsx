"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Platform = "MEITUAN" | "B_JIA";
type OrderResult = { platform: Platform; orderNumber: string; dishPrice: number; packagingFee: number; platformRedPacket: number; originalDeliveryFee: number; deliveryFeeReduction: number; paidDeliveryFee: number; merchantSettlementAmount: number; userPaidAmount: number; otherPromotion: number; technicalServiceFee: number; deliveryServiceFee: number; merchantRate: number; confidence: number };
type Image = { imageId: string; platform: Platform; recognitionStatus: string | null; structuredResult: OrderResult | null; failureReason: string | null };
type Collection = { collectionSessionId: string; status: string; merchantName: string; merchantCode: string; cityName: string; images: Image[] };

const labels: Record<Exclude<keyof OrderResult, "platform" | "confidence">, string> = { orderNumber: "订单号", dishPrice: "菜品原价", packagingFee: "餐盒费", platformRedPacket: "平台红包", originalDeliveryFee: "原价配送费", deliveryFeeReduction: "减配送费", paidDeliveryFee: "实付配送费", merchantSettlementAmount: "商家结算金额", userPaidAmount: "用户实付", otherPromotion: "其他活动", technicalServiceFee: "技术服务费", deliveryServiceFee: "配送服务费", merchantRate: "商家费率" };
const fields = Object.keys(labels) as Array<Exclude<keyof OrderResult, "platform" | "confidence">>;

async function json(response: Response) { const value = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof value.error === "string" ? value.error : "请求失败，请稍后重试"); return value; }

export default function CollectionRecognitionPage() {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [drafts, setDrafts] = useState<Record<Platform, OrderResult | null>>({ MEITUAN: null, B_JIA: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ tone: "info", text: "正在读取采集任务…" });
  const load = useCallback(async () => {
    try { const value = await json(await fetch(`/api/collections/${id}`)) as Collection; setCollection(value); setDrafts({ MEITUAN: value.images.find((image) => image.platform === "MEITUAN")?.structuredResult ?? null, B_JIA: value.images.find((image) => image.platform === "B_JIA")?.structuredResult ?? null }); setNotice({ tone: "info", text: value.status === "UPLOADED" ? "两张原图已保存，现在可以开始 AI 识别。" : "请核对两份识别结果，必要时直接修改后确认。" }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "读取采集任务失败" }); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const recognize = async () => { if (busy) return; setBusy(true); setNotice({ tone: "info", text: "千问正在识别美团与 B 家订单长图…" }); try { const value = await json(await fetch(`/api/collections/${id}/recognize`, { method: "POST" })); setNotice({ tone: value.status === "RECOGNIZED" ? "success" : "error", text: value.status === "RECOGNIZED" ? "识别完成，请核对后确认。" : "识别未通过严格校验，请重新上传完整订单图。" }); await load(); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "识别任务失败" }); } finally { setBusy(false); } };
  const update = (platform: Platform, field: keyof OrderResult, value: string) => setDrafts((current) => { const draft = current[platform]; return draft ? { ...current, [platform]: { ...draft, [field]: field === "orderNumber" ? value : Number(value) } } : current; });
  const confirm = async () => { if (!drafts.MEITUAN || !drafts.B_JIA || busy) return; setBusy(true); setNotice({ tone: "info", text: "正在正式保存两平台订单数据…" }); try { await json(await fetch(`/api/collections/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ results: [drafts.MEITUAN, drafts.B_JIA] }) })); setNotice({ tone: "success", text: "已确认并正式保存。下一阶段将生成美团 VS B 家对比。" }); await load(); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "确认保存失败" }); } finally { setBusy(false); } };
  return <main className="collection-page recognition-page"><header className="collection-heading"><div><p>订单识别与确认</p><h1>核对后，才进入正式数据</h1><span>AI 完成双平台结构化识别；你可以修改任何字段，再一次性确认保存。</span></div><span className="collection-stage">P0-3 · AI 识别</span></header>{collection ? <section className="collection-card recognition-actions"><div><p className="eyebrow">采集商家</p><h2>{collection.merchantName}</h2><span>{collection.cityName} · {collection.merchantCode}</span></div><button className="primary" disabled={busy || collection.status === "CONFIRMED"} onClick={recognize}>{busy ? "正在识别…" : "开始 AI 识别"}</button></section> : null}<section className="recognition-result-grid">{(["MEITUAN", "B_JIA"] as Platform[]).map((platform) => <ResultCard key={platform} platform={platform} draft={drafts[platform]} image={collection?.images.find((item) => item.platform === platform)} update={update} />)}</section><section className="collection-card confirmation-bar"><div><p className="eyebrow">人工确认</p><h2>识别结果无误后，正式保存</h2><span>系统会再次校验完整字段和配送费计算关系。</span></div><button className="primary" disabled={busy || !drafts.MEITUAN || !drafts.B_JIA || collection?.status === "CONFIRMED"} onClick={confirm}>{busy ? "正在保存…" : collection?.status === "CONFIRMED" ? "已正式保存" : "确认并正式保存"}</button></section><p className={`collection-notice ${notice.tone}`}>{notice.text}</p></main>;
}

function ResultCard({ platform, draft, image, update }: { platform: Platform; draft: OrderResult | null; image: Image | undefined; update: (platform: Platform, field: keyof OrderResult, value: string) => void }) {
  const title = platform === "MEITUAN" ? "美团订单" : "B 家订单";
  return <section className="collection-card recognition-result-card"><div className="collection-card-heading"><div><p className="eyebrow">{platform === "MEITUAN" ? "美团" : "B 家"}</p><h2>{title}</h2></div><span>{image?.recognitionStatus === "SUCCESS" ? "已识别" : "待识别"}</span></div>{!draft ? <div className="recognition-empty"><strong>{image?.failureReason ? "识别未通过" : "等待识别"}</strong><span>{image?.failureReason ?? "开始 AI 识别后将在这里显示完整字段。"}</span></div> : <div className="recognition-fields">{fields.map((field) => <label key={field}>{labels[field]}<input aria-label={`${title}${labels[field]}`} type={field === "orderNumber" ? "text" : "number"} step="0.01" value={draft[field]} onChange={(event) => update(platform, field, event.target.value)} /></label>)}<p className="recognition-confidence">AI 置信度：{Math.round(draft.confidence * 100)}%</p></div>}</section>;
}
