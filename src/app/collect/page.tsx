"use client";

import { useEffect, useMemo, useState } from "react";

type BdIdentity = { bdName: string };
type Merchant = { merchantId: string; merchantCode: string; merchantName: string; cityName: string };

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "请求失败，请稍后重试");
  return data;
}

export default function CollectPage() {
  const [identities, setIdentities] = useState<BdIdentity[]>([]);
  const [selectedBd, setSelectedBd] = useState("");
  const [activeBd, setActiveBd] = useState("");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState("");
  const [meituanFile, setMeituanFile] = useState<File | null>(null);
  const [bJiaFile, setBJiaFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/bd/session").then(readJson).then((data) => setIdentities(data.items ?? [])).catch((error: Error) => setStatus({ tone: "error", text: error.message }));
  }, []);

  useEffect(() => {
    if (!activeBd) return;
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (query.trim()) params.set("query", query.trim());
    fetch(`/api/bd/merchants?${params}`).then(readJson).then((data) => {
      setMerchants(data.items ?? []);
      setMerchantId((current) => (data.items ?? []).some((item: Merchant) => item.merchantId === current) ? current : "");
    }).catch((error: Error) => setStatus({ tone: "error", text: error.message }));
  }, [activeBd, city, query]);

  const cities = useMemo(() => [...new Set(merchants.map((merchant) => merchant.cityName))], [merchants]);
  const selectedMerchant = merchants.find((merchant) => merchant.merchantId === merchantId);

  async function enterWorkspace() {
    if (!selectedBd || busy) return;
    setBusy(true); setStatus(null);
    try {
      const response = await fetch("/api/bd/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bdName: selectedBd }) });
      const data = await readJson(response);
      setActiveBd(data.bdName); setStatus({ tone: "success", text: `已进入 ${data.bdName} 的采集工作区` });
    } catch (error) { setStatus({ tone: "error", text: error instanceof Error ? error.message : "进入失败" }); }
    finally { setBusy(false); }
  }

  async function submitCollection() {
    if (!merchantId || !meituanFile || !bJiaFile || !Number.isFinite(Number(originalDeliveryFee)) || Number(originalDeliveryFee) < 0 || busy) return;
    setBusy(true); setStatus({ tone: "info", text: "正在保存两张订单原图并创建采集任务…" });
    try {
      const form = new FormData();
      form.set("merchantId", merchantId); form.set("originalDeliveryFee", originalDeliveryFee); form.set("meituanFile", meituanFile); form.set("bJiaFile", bJiaFile);
      const result = await readJson(await fetch("/api/uploads", { method: "POST", body: form }));
      setStatus({ tone: "success", text: `采集任务已创建（${result.collectionSessionId}）。下一阶段将自动进入 AI 识别。` });
      setMeituanFile(null); setBJiaFile(null);
      window.location.assign(`/collect/${result.collectionSessionId}`);
    } catch (error) { setStatus({ tone: "error", text: error instanceof Error ? error.message : "上传失败" }); }
    finally { setBusy(false); }
  }

  return <main className="collection-page">
    <header className="collection-heading"><div><p>订单采集</p><h1>一次采集，完成双平台对照</h1><span>只需选择名下商家，再上传美团与 B 家的订单长图。系统会保存证据并在下一步识别数据。</span></div><span className="collection-stage">P0-2 · 采集入库</span></header>
    {!activeBd ? <section className="collection-card identity-card"><div><p className="eyebrow">01 · 身份</p><h2>选择我的身份</h2><span>仅能查看并采集自己负责的商家。</span></div><div className="identity-action"><select aria-label="选择我的身份" value={selectedBd} onChange={(event) => setSelectedBd(event.target.value)}><option value="">请选择 BD</option>{identities.map((identity) => <option value={identity.bdName} key={identity.bdName}>{identity.bdName}</option>)}</select><button className="primary" disabled={!selectedBd || busy} onClick={enterWorkspace}>{busy ? "正在进入…" : "进入采集工作区"}</button></div></section> : <>
      <section className="collection-card collection-context"><div><p className="eyebrow">当前采集人</p><strong>{activeBd}</strong><span>系统已限定为我的有效商家范围</span></div><button className="secondary" onClick={() => { setActiveBd(""); setMerchants([]); setMerchantId(""); }}>切换身份</button></section>
      <section className="collection-card"><div className="collection-card-heading"><div><p className="eyebrow">02 · 商家</p><h2>我负责的商家</h2></div><span>{merchants.length} 家匹配商家</span></div><div className="collection-filters"><label>城市<select value={city} onChange={(event) => setCity(event.target.value)}><option value="">全部城市</option>{cities.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label>商家搜索<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入商家 ID 或名称" /></label><label>选择商家<select value={merchantId} onChange={(event) => setMerchantId(event.target.value)}><option value="">请选择商家</option>{merchants.map((merchant) => <option value={merchant.merchantId} key={merchant.merchantId}>{merchant.cityName} · {merchant.merchantCode} · {merchant.merchantName}</option>)}</select></label></div>{selectedMerchant ? <div className="selected-merchant"><span>本次采集商家</span><strong>{selectedMerchant.merchantName}</strong><small>{selectedMerchant.cityName} · {selectedMerchant.merchantCode}</small></div> : null}</section>
      <section className="collection-card"><div className="collection-card-heading"><div><p className="eyebrow">03 · 配送费与原图</p><h2>填写原价配送费，再上传两张订单长图</h2></div><span>原价配送费由 BD 按商家实际配送价填写</span></div><div className="collection-filters"><label>原价配送费（元）<input aria-label="原价配送费" type="number" min="0" step="0.01" inputMode="decimal" value={originalDeliveryFee} onChange={(event) => setOriginalDeliveryFee(event.target.value)} placeholder="例如 5.00" /></label></div><div className="dual-upload-grid"><UploadSlot title="美团订单长图" file={meituanFile} onChange={setMeituanFile} /><UploadSlot title="B 家订单长图" file={bJiaFile} onChange={setBJiaFile} /></div><button className="primary collection-submit" disabled={!merchantId || !meituanFile || !bJiaFile || !Number.isFinite(Number(originalDeliveryFee)) || Number(originalDeliveryFee) < 0 || busy} onClick={submitCollection}>{busy ? "正在创建采集任务…" : "保存原图并创建采集任务"}</button></section>
    </>}
    {status ? <p className={`collection-notice ${status.tone}`}>{status.text}</p> : null}
  </main>;
}

function UploadSlot({ title, file, onChange }: { title: string; file: File | null; onChange: (file: File | null) => void }) {
  return <label className="collection-upload-slot"><input aria-label={title} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onChange(event.target.files?.[0] ?? null)} /><span>{title}</span><strong>{file ? file.name : "选择图片"}</strong><small>{file ? `${Math.ceil(file.size / 1024)} KB` : "请上传完整订单详情长图"}</small></label>;
}
