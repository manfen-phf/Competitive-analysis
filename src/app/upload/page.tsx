"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Merchant = { merchantId: string; merchantName: string; bdName: string };

export default function Upload() {
  const [cities, setCities] = useState<string[]>([]); const [city, setCity] = useState(""); const [merchantId, setMerchantId] = useState("");
  const [query, setQuery] = useState(""); const [merchants, setMerchants] = useState<Merchant[]>([]); const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/filter-options").then((r) => r.json()).then((x) => setCities(x.values ?? [])); }, []);
  useEffect(() => { if (!city) { setMerchants([]); return; } fetch(`/api/merchants?city=${encodeURIComponent(city)}&query=${encodeURIComponent(query)}`).then((r) => r.json()).then((x) => setMerchants(x.merchants ?? [])); }, [city, query]);
  async function submit() {
    if (!file || busy) return;
    setBusy(true); setStatus("正在识别并校验字段…");
    const form = new FormData(); form.set("city", city); form.set("merchantId", merchantId); form.set("file", file);
    try { const response = await fetch("/api/uploads", { method: "POST", body: form }); const body = await response.json(); setStatus(body.reason || body.error || (body.status === "SUCCESS" ? "识别成功，已入库" : "上传失败")); }
    catch { setStatus("网络异常，请稍后重试"); } finally { setBusy(false); }
  }
  return <main><Link href="/">← 首页</Link><h1>订单截图上传</h1><p className="muted">先选城市，再搜索并选择商家。平台由图片自动识别；字段不完整、置信度不足或金额关系异常都会上传失败。</p><div className="filters"><label>城市<select value={city} onChange={(e) => { setCity(e.target.value); setMerchantId(""); }}><option value="">请选择城市</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label><label>商家搜索<input placeholder="输入商家 ID 或名称" value={query} disabled={!city} onChange={(e) => setQuery(e.target.value)} /></label><label>商家<select value={merchantId} disabled={!city} onChange={(e) => setMerchantId(e.target.value)}><option value="">选择商家</option>{merchants.map((item) => <option key={item.merchantId} value={item.merchantId}>{item.merchantName}（{item.merchantId} / {item.bdName}）</option>)}</select></label><label>订单截图<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><button className="primary" onClick={submit} disabled={!file || !merchantId || busy}>{busy ? "识别中…" : "开始 AI 识别并入库"}</button></div>{status && <p className="status">{status}</p>}</main>;
}
