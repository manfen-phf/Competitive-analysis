"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CollectionWizard } from "@/components/collection/collection-wizard";
import { OrderReviewForm } from "@/components/collection/order-review-form";
import { PlatformUploadCard, type UploadCardStatus } from "@/components/collection/platform-upload-card";
import type { CollectionReviewInput } from "@/lib/collection-confirmation";
import type { CollectionFieldErrors, UploadPlatform } from "@/lib/collections";

type Merchant = { merchantId: string; merchantName: string; bdName: string };
type CurrentUser = { role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD"; city: string | null; bdName: string | null };
type Collection = { id: string; merchantId: string; merchantName: string; city: string; bdName: string; originalDeliveryFee: number };
type PlatformState = { status: UploadCardStatus; message?: string; recognitionResult?: Record<string, unknown> };
type PendingCollection = Collection & { createdAt: string; uploads: Array<{ platform: UploadPlatform | null; recognitionStatus: string }> };

const initialImages: Record<UploadPlatform, PlatformState> = { MEITUAN: { status: "EMPTY" }, B_JIA: { status: "EMPTY" } };

function reviewFromRecognition(platform: UploadPlatform, recognition: Record<string, unknown>): CollectionReviewInput {
  const number = (field: string) => typeof recognition[field] === "number" ? recognition[field] as number : 0;
  return {
    platform,
    goodsTotal: number("dishPrice") + number("packagingFee"),
    packagingFee: number("packagingFee"), merchantActivity: 0, otherPromotion: number("otherPromotion"), deliveryFeeReduction: number("deliveryFeeReduction"), platformRedPacket: number("platformRedPacket"), platformRedPacketMerchantShare: number("platformRedPacketMerchantShare"), merchantSettlementAmount: number("merchantSettlementAmount"), technicalServiceFee: number("technicalServiceFee"), deliveryServiceFee: number("deliveryServiceFee"), orderNumber: typeof recognition.orderNumber === "string" ? recognition.orderNumber : "",
  };
}

export default function Upload() {
  const searchParams = useSearchParams();
  const viewingPendingQueue = searchParams.get("view") === "pending";
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState("");
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState("");
  const [collection, setCollection] = useState<Collection | null>(null);
  const [images, setImages] = useState(initialImages);
  const [reviews, setReviews] = useState<CollectionReviewInput[]>([]);
  const [fieldErrors, setFieldErrors] = useState<CollectionFieldErrors>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingCollections, setPendingCollections] = useState<PendingCollection[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/auth/me").then((response) => response.json()), fetch("/api/filter-options").then((response) => response.json())]).then(([session, options]) => {
      const current = session.user as CurrentUser | undefined;
      setUser(current ?? null);
      setCities(options.values ?? []);
      if (current?.role === "BD" && current.city) setCity(current.city);
    }).catch(() => setNotice("无法加载当前账号或商家范围，请刷新后重试。"));
  }, []);

  useEffect(() => {
    if (!viewingPendingQueue) return;
    fetch("/api/collections?status=READY_TO_CONFIRM")
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error((await response.json()).error)))
      .then((payload) => setPendingCollections(payload.collections ?? []))
      .catch((error) => setNotice(error.message || "待确认任务加载失败"));
  }, [viewingPendingQueue]);

  useEffect(() => {
    if (!city || collection) { setMerchants([]); return; }
    const controller = new AbortController();
    fetch(`/api/merchants?city=${encodeURIComponent(city)}&query=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error((await response.json()).error)))
      .then((payload) => setMerchants(payload.merchants ?? []))
      .catch((error) => { if (error.name !== "AbortError") setNotice(error.message || "商家范围加载失败"); });
    return () => controller.abort();
  }, [city, query, collection]);

  const selectedMerchant = useMemo(() => merchants.find((merchant) => merchant.merchantId === merchantId), [merchantId, merchants]);
  const reviewReady = images.MEITUAN.status === "SUCCEEDED" && images.B_JIA.status === "SUCCEEDED";
  const activeStep = collection ? reviewReady ? 2 : 1 : 0;

  async function createCollection() {
    if (busy || !city || !merchantId || !originalDeliveryFee.trim()) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, merchantId, originalDeliveryFee: Number(originalDeliveryFee) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "创建采集任务失败");
      setCollection(payload.collection); setNotice("采集任务已创建，请分别上传两张平台截图。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "创建采集任务失败"); } finally { setBusy(false); }
  }

  async function uploadImage(platform: UploadPlatform, file: File) {
    if (!collection || busy) return;
    setBusy(true); setNotice(""); setImages((current) => ({ ...current, [platform]: { status: "UPLOADING" } }));
    const form = new FormData(); form.set("platform", platform); form.set("file", file);
    try {
      setImages((current) => ({ ...current, [platform]: { status: "RECOGNIZING" } }));
      const response = await fetch(`/api/collections/${collection.id}/images`, { method: "POST", body: form });
      const payload = await response.json();
      if (payload.status === "SUCCEEDED") {
        const recognition = payload.upload.recognitionResult as Record<string, unknown>;
        setImages((current) => ({ ...current, [platform]: { status: "SUCCEEDED", recognitionResult: recognition } }));
        setReviews((current) => [...current.filter((review) => review.platform !== platform), reviewFromRecognition(platform, recognition)]);
        setNotice("图片识别成功，可继续上传另一平台截图。");
      } else {
        const status = payload.status === "DUPLICATE" ? "DUPLICATE" : "FAILED";
        const duplicate = payload.duplicateOf ? ` 已有记录：${payload.duplicateOf.merchantName} · ${payload.duplicateOf.platform} · ${new Date(payload.duplicateOf.uploadedAt).toLocaleString("zh-CN")}` : "";
        setImages((current) => ({ ...current, [platform]: { status, message: (payload.error || "该截图已上传") + duplicate } }));
      }
    } catch { setImages((current) => ({ ...current, [platform]: { status: "FAILED", message: "网络异常，请重新上传" } })); }
    finally { setBusy(false); }
  }

  function updateReview(platform: UploadPlatform, field: keyof CollectionReviewInput, value: number | string) {
    setReviews((current) => current.map((review) => review.platform === platform ? { ...review, [field]: value } : review));
  }

  async function confirm() {
    if (!collection || !reviewReady || busy) return;
    setBusy(true); setNotice(""); setFieldErrors(undefined);
    try {
      const response = await fetch(`/api/collections/${collection.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviews }) });
      const payload = await response.json();
      if (!response.ok) { setFieldErrors(payload.fieldErrors); throw new Error(payload.error || "确认失败"); }
      setNotice("已确认入库：美团与 B 家各生成一条订单记录。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "确认失败"); } finally { setBusy(false); }
  }

  if (viewingPendingQueue) return <main className="collection-page">
    <header className="collection-page-header"><div><Link className="workspace-back-link" href="/">返回概览</Link><h1>待确认采集</h1><p>仅展示双平台图片均已识别、尚未正式入库的采集任务。</p></div><Link href="/upload" className="collection-primary">继续采集</Link></header>
    <section className="collection-task-panel" aria-label="待确认采集列表">
      <div className="collection-task-heading"><div><h2>待确认队列</h2><p>共 {pendingCollections.length} 个任务，确认后才会进入分析和数据中心。</p></div></div>
      {pendingCollections.length ? <ul className="overview-activity-list">{pendingCollections.map((task) => <li key={task.id}><div><strong>{task.merchantName}</strong><span>{task.city} · {task.bdName} · 原价配送费 ¥{task.originalDeliveryFee.toFixed(2)}</span><small>{task.uploads.map((upload) => `${upload.platform === "MEITUAN" ? "美团" : "B家"}：${upload.recognitionStatus}`).join(" · ")}</small></div></li>)}</ul> : <p className="collection-notice">暂无待人工确认的采集任务。</p>}
    </section>
    {notice ? <p className="collection-notice" role="status">{notice}</p> : null}
  </main>;

  return <main className="collection-page">
    <header className="collection-page-header"><div><Link className="workspace-back-link" href="/">返回概览</Link><h1>双平台订单采集</h1><p>一次采集绑定同一商家、同一 BD 和原价配送费；完成美团与 B 家截图识别后再统一确认。</p></div></header>
    <CollectionWizard steps={["选择商家", "上传双平台截图", "核对并确认"]} activeStep={activeStep} />
    <section className="collection-task-panel">
      <div className="collection-task-heading"><div><h2>{collection ? "当前采集任务" : "选择本次采集商家"}</h2><p>{collection ? "任务已保存，可继续上传或校对。" : "仅显示当前账号有权限采集的商家。"}</p></div>{collection ? <span className="collection-task-status">待确认</span> : null}</div>
      {collection ? <dl className="collection-merchant-summary"><div><dt>城市</dt><dd>{collection.city}</dd></div><div><dt>商家</dt><dd>{collection.merchantName}</dd></div><div><dt>商家 ID</dt><dd>{collection.merchantId}</dd></div><div><dt>BD</dt><dd>{collection.bdName}</dd></div><div><dt>原价配送费</dt><dd>¥{collection.originalDeliveryFee.toFixed(2)}</dd></div></dl> : <div className="collection-merchant-fields">
        <label>城市<select value={city} disabled={user?.role === "BD"} onChange={(event) => { setCity(event.target.value); setMerchantId(""); }}><option value="">请选择城市</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>搜索商家<input value={query} disabled={!city} placeholder="商家名称或 ID" onChange={(event) => setQuery(event.target.value)} /></label>
        <label>商家<select value={merchantId} disabled={!city} onChange={(event) => setMerchantId(event.target.value)}><option value="">请选择商家</option>{merchants.map((merchant) => <option key={merchant.merchantId} value={merchant.merchantId}>{merchant.merchantName}（{merchant.merchantId} / {merchant.bdName}）</option>)}</select></label>
        <label>原价配送费<span className="collection-money-input"><i>¥</i><input type="number" min="0" step="0.01" value={originalDeliveryFee} onChange={(event) => setOriginalDeliveryFee(event.target.value)} /></span></label>
        {selectedMerchant ? <p className="collection-merchant-hint">当前归属 BD：{selectedMerchant.bdName}</p> : null}
        <button type="button" className="collection-primary" disabled={!city || !merchantId || !originalDeliveryFee.trim() || busy} onClick={createCollection}>{busy ? "创建中…" : "创建采集任务"}</button>
      </div>}
    </section>
    {collection ? <><section className="collection-upload-grid"><PlatformUploadCard platform="MEITUAN" status={images.MEITUAN.status} message={images.MEITUAN.message} disabled={busy} onFileChange={(file) => uploadImage("MEITUAN", file)} /><PlatformUploadCard platform="B_JIA" status={images.B_JIA.status} message={images.B_JIA.message} disabled={busy} onFileChange={(file) => uploadImage("B_JIA", file)} /></section>
      {reviewReady && reviews.length === 2 ? <><OrderReviewForm originalDeliveryFee={collection.originalDeliveryFee} reviews={reviews} fieldErrors={fieldErrors} onChange={updateReview} /><button type="button" className="collection-primary collection-confirm" disabled={busy} onClick={confirm}>{busy ? "确认中…" : "确认并生成两条订单"}</button></> : null}</> : null}
    {notice ? <p className="collection-notice" role="status">{notice}</p> : null}
  </main>;
}
